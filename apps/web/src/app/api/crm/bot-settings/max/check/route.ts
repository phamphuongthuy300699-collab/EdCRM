import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { getMaxBotInfo } from "@/lib/bots/max/client";
import { requireBotStaff } from "@/lib/bots/max/utils";

export async function POST() {
  const access = await requireBotStaff();
  if (!access.ok) return access.response;
  const admin = createSupabaseAdminClient();
  const { data: settings } = await (admin.from("bot_settings") as any)
    .select("bot_token_secret")
    .eq("organization_id", access.organizationId)
    .eq("provider", "max")
    .maybeSingle();
  if (!settings?.bot_token_secret) return NextResponse.json({ ok: false, error: "MAX token не настроен" }, { status: 409 });
  try {
    const info: any = await getMaxBotInfo(settings.bot_token_secret);
    return NextResponse.json({ ok: true, bot: { username: info?.username || info?.name || "", id: info?.id || null } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Не удалось проверить токен" }, { status: 502 });
  }
}
