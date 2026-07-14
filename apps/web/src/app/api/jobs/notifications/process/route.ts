import { NextResponse } from "next/server";
import { buildPayInvoiceMessage, sendMaxMessage } from "@/lib/bots/max/client";
import { canProcessNotificationsWithRequest } from "@/lib/bots/max/utils";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";

export async function POST(request: Request) {
  const access = await canProcessNotificationsWithRequest(request);
  if (!access.ok) return access.response;

  const admin = createSupabaseAdminClient();
  let query = (admin.from("notification_outbox") as any)
    .select("*")
    .eq("status", "pending")
    .eq("channel", "max")
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
      await sendMaxMessage(settings.bot_token_secret, {
        userId: account.external_user_id,
        chatId: account.chat_id,
        text: buildPayInvoiceMessage(payload),
        linkUrl: payload.payUrl,
        linkText: "Оплатить счёт",
      });

      await (admin.from("notification_outbox") as any)
        .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
        .eq("id", item.id);
      sent += 1;
    } catch (err: any) {
      await (admin.from("notification_outbox") as any)
        .update({ status: "failed", error: err.message || "MAX send failed" })
        .eq("id", item.id);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, processed: (items || []).length, sent, failed });
}
