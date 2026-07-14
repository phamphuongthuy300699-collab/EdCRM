import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { subscribeMaxWebhook } from "@/lib/bots/max/client";
import { requireBotStaff } from "@/lib/bots/max/utils";

export async function POST() {
  const access = await requireBotStaff();
  if (!access.ok) return access.response;
  const admin = createSupabaseAdminClient();
  const { data: settings } = await (admin.from("bot_settings") as any)
    .select("bot_token_secret, webhook_url, webhook_secret")
    .eq("organization_id", access.organizationId)
    .eq("provider", "max")
    .maybeSingle();
  if (!settings?.bot_token_secret || !settings?.webhook_url || !settings?.webhook_secret) {
    return NextResponse.json({ ok: false, error: "Заполните token, webhook URL и secret" }, { status: 409 });
  }
  try {
    await subscribeMaxWebhook(settings.bot_token_secret, settings.webhook_url, settings.webhook_secret);
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Не удалось подписать webhook" }, { status: 502 });
  }
}
