import { NextResponse } from "next/server";
import { buildPayInvoiceMessage, sendMaxMessage } from "@/lib/bots/max/client";
import { canProcessNotificationsWithRequest } from "@/lib/bots/max/utils";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { buildScheduleNotificationText, type ScheduleNotificationKey } from "@/features/scheduling/domain";
import { checkRateLimit, rateLimitResponse, requestFingerprint } from "@/lib/security/rate-limit";

async function syncLessonNotificationStatus(admin: ReturnType<typeof createSupabaseAdminClient>, lessonSessionId?: string | null) {
  if (!lessonSessionId) return;
  const { data: related } = await (admin.from("notification_outbox") as any).select("status").eq("lesson_session_id", lessonSessionId);
  if (!related?.length || related.some((item: any) => item.status === "pending")) return;
  const status = related.some((item: any) => item.status === "failed") ? "failed" : "sent";
  await (admin.from("lesson_sessions") as any).update({ notification_status: status }).eq("id", lessonSessionId);
}

async function processNotifications(request: Request) {
  const access = await canProcessNotificationsWithRequest(request);
  if (!access.ok) return access.response;
  const rate = checkRateLimit({ key: `notification-worker:${access.organizationId || requestFingerprint(request)}`, limit: 30, windowMs: 60_000 });
  if (!rate.allowed) return rateLimitResponse(rate);

  const admin = createSupabaseAdminClient();
  const now = new Date();
  let query = (admin.from("notification_outbox") as any)
    .select("*")
    .eq("status", "pending")
    .eq("channel", "max")
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now.toISOString()}`)
    .order("created_at", { ascending: true })
    .limit(20);

  if (access.organizationId) query = query.eq("organization_id", access.organizationId);

  const { data: items, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let sent = 0;
  let failed = 0;

  for (const item of items || []) {
    try {
      const { data: settings } = await (admin.from("bot_settings") as any)
        .select("bot_token_secret, is_enabled")
        .eq("organization_id", item.organization_id)
        .eq("provider", "max")
        .maybeSingle();
      if (!settings?.is_enabled || !settings?.bot_token_secret) throw new Error("MAX bot disabled or token missing");

      const { data: account } = await (admin.from("guardian_messenger_accounts") as any)
        .select("external_user_id, chat_id")
        .eq("organization_id", item.organization_id)
        .eq("guardian_id", item.guardian_id)
        .eq("provider", "max")
        .eq("is_verified", true)
        .maybeSingle();
      if (!account) throw new Error("MAX account not linked");

      const payload = item.payload || {};
      const isInvoice = ["pay_invoice", "invoice_payment_link"].includes(item.template_key);
      const message = isInvoice ? {
        text: buildPayInvoiceMessage(payload),
        linkUrl: payload.payUrl,
        linkText: "Оплатить счёт",
      } : {
        text: buildScheduleNotificationText(item.template_key as ScheduleNotificationKey, payload),
      };
      await sendMaxMessage(settings.bot_token_secret, {
        userId: account.external_user_id,
        chatId: account.chat_id,
        ...message,
      });

      await (admin.from("notification_outbox") as any)
        .update({ status: "sent", sent_at: new Date().toISOString(), next_attempt_at: null, error: null })
        .eq("id", item.id);
      await syncLessonNotificationStatus(admin, item.lesson_session_id);
      sent += 1;
    } catch (err: any) {
      const attempts = Number(item.attempt_count || 0) + 1;
      const retryAt = new Date(Date.now() + attempts * 5 * 60_000).toISOString();
      await (admin.from("notification_outbox") as any)
        .update({
          status: attempts >= 3 ? "failed" : "pending",
          attempt_count: attempts,
          next_attempt_at: attempts >= 3 ? null : retryAt,
          error: err.message || "MAX send failed",
        })
        .eq("id", item.id);
      await syncLessonNotificationStatus(admin, item.lesson_session_id);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, processed: (items || []).length, sent, failed });
}

export async function GET(request: Request) {
  return processNotifications(request);
}

export async function POST(request: Request) {
  return processNotifications(request);
}
