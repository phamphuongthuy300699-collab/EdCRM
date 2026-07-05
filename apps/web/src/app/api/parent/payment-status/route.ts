import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoMode } from "@/shared/utils/demo";

export async function GET() {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, onlinePaymentEnabled: false, provider: "alfabank", secretsConfigured: false });
    }

    const supabase = createSupabaseAdminClient();
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", process.env.DEFAULT_ORG_SLUG || "robotics-lipetsk")
      .single();

    if (!org) {
      return NextResponse.json({ ok: true, onlinePaymentEnabled: false, provider: "alfabank", secretsConfigured: false });
    }

    const { data: settings } = await (supabase.from("payment_provider_settings") as any)
      .select("is_enabled, mode, api_login, api_password_secret")
      .eq("organization_id", org.id)
      .eq("provider", "alfabank")
      .maybeSingle();

    const secretsConfigured = Boolean(settings?.api_login && settings?.api_password_secret);

    return NextResponse.json({
      ok: true,
      provider: "alfabank",
      mode: settings?.mode || "test",
      secretsConfigured,
      onlinePaymentEnabled: Boolean(settings?.is_enabled && secretsConfigured),
    });
  } catch (error) {
    console.error("Parent payment status error:", error);
    return NextResponse.json({ ok: true, onlinePaymentEnabled: false, provider: "alfabank", secretsConfigured: false });
  }
}
