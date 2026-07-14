import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { newWebhookSecret, requireBotStaff } from "@/lib/bots/max/utils";

const DEFAULT_MAX_WEBHOOK_URL = "https://робокс48.рф/api/bots/max/webhook";

const payloadSchema = z.object({
  isEnabled: z.boolean(),
  botToken: z.string().optional(),
  webhookSecret: z.string().optional(),
  webhookUrl: z.string().optional(),
  botUsername: z.string().optional(),
});

function sanitize(row: any) {
  return {
    isEnabled: row?.is_enabled === true,
    tokenConfigured: Boolean(row?.bot_token_secret),
    webhookSecret: row?.webhook_secret || "",
    webhookUrl: row?.webhook_url || DEFAULT_MAX_WEBHOOK_URL,
    botUsername: row?.bot_username || "",
    settings: row?.settings || {},
  };
}

export async function GET() {
  const access = await requireBotStaff();
  if (!access.ok) return access.response;
  const admin = createSupabaseAdminClient();
  const { data } = await (admin.from("bot_settings") as any)
    .select("*")
    .eq("organization_id", access.organizationId)
    .eq("provider", "max")
    .maybeSingle();
  return NextResponse.json({ ok: true, settings: sanitize(data) });
}

export async function POST(request: Request) {
  const access = await requireBotStaff();
  if (!access.ok) return access.response;

  const parsed = payloadSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Некорректные настройки MAX" }, { status: 422 });

  const admin = createSupabaseAdminClient();
  const { data: current } = await (admin.from("bot_settings") as any)
    .select("bot_token_secret, webhook_secret, settings")
    .eq("organization_id", access.organizationId)
    .eq("provider", "max")
    .maybeSingle();

  const webhookSecret = parsed.data.webhookSecret?.trim() || current?.webhook_secret || newWebhookSecret();
  const { error } = await (admin.from("bot_settings") as any).upsert(
    {
      organization_id: access.organizationId,
      provider: "max",
      is_enabled: parsed.data.isEnabled,
      bot_token_secret: parsed.data.botToken?.trim() || current?.bot_token_secret || null,
      webhook_secret: webhookSecret,
      bot_username: parsed.data.botUsername?.trim() || null,
      webhook_url: parsed.data.webhookUrl?.trim() || DEFAULT_MAX_WEBHOOK_URL,
      settings: current?.settings || {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,provider" },
  );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const { data } = await (admin.from("bot_settings") as any)
    .select("*")
    .eq("organization_id", access.organizationId)
    .eq("provider", "max")
    .maybeSingle();
  return NextResponse.json({ ok: true, settings: sanitize(data) });
}
