import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { requireBotStaff } from "@/lib/bots/max/utils";

const retrySchema = z.object({ id: z.string().uuid() }).strict();

export async function GET(request: Request) {
  const access = await requireBotStaff();
  if (!access.ok) return access.response;
  const status = new URL(request.url).searchParams.get("status");
  const admin = createSupabaseAdminClient();
  let query = (admin.from("notification_outbox") as any)
    .select("id, template_key, status, attempt_count, error, created_at, sent_at, next_attempt_at, guardians(full_name), students(full_name)")
    .eq("organization_id", access.organizationId)
    .eq("channel", "max")
    .order("created_at", { ascending: false })
    .limit(50);
  if (status && ["pending", "sent", "failed"].includes(status)) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const staleBefore = Date.now() - 10 * 60_000;
  return NextResponse.json({ ok: true, items: (data || []).map((item: any) => ({ ...item, is_stale: item.status === "pending" && new Date(item.created_at).getTime() < staleBefore })) });
}

export async function POST(request: Request) {
  const access = await requireBotStaff();
  if (!access.ok) return access.response;
  const parsed = retrySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Некорректное уведомление" }, { status: 422 });
  const admin = createSupabaseAdminClient();
  const { data, error } = await (admin.from("notification_outbox") as any)
    .update({ status: "pending", next_attempt_at: null, error: null })
    .eq("organization_id", access.organizationId)
    .eq("channel", "max")
    .eq("id", parsed.data.id)
    .eq("status", "failed")
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Уведомление не найдено или уже обрабатывается" }, { status: 409 });
  return NextResponse.json({ ok: true, id: data.id });
}
