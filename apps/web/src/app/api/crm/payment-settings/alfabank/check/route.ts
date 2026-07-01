import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoMode } from "@/shared/utils/demo";
import { requirePaymentAdmin } from "../_shared";

function isValidUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function POST() {
  try {
    if (isDemoMode()) {
      return NextResponse.json({
        ok: true,
        status: "warning",
        message: "Demo mode: проверка выполнена без обращения к Альфа-Банку.",
      });
    }

    const access = await requirePaymentAdmin();
    if (!access.ok) return access.response;

    const admin = createSupabaseAdminClient();
    const { data, error } = await (admin.from("payment_provider_settings") as any)
      .select("mode, api_login, api_password_secret, test_gateway_url, production_gateway_url, settings")
      .eq("organization_id", access.organizationId)
      .eq("provider", "alfabank")
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      return NextResponse.json({ ok: false, status: "error", message: "Настройки Альфа-Банка ещё не сохранены." }, { status: 400 });
    }

    const gatewayUrl = data.mode === "production" ? data.production_gateway_url : data.test_gateway_url;
    const missing = [
      !data.api_login ? "API login" : "",
      !data.api_password_secret ? "API password" : "",
      !isValidUrl(gatewayUrl) ? "gateway URL" : "",
    ].filter(Boolean);

    const settings = {
      ...(data.settings || {}),
      lastCheckedAt: new Date().toISOString(),
      lastCheckStatus: missing.length ? "error" : "ok",
    };

    await (admin.from("payment_provider_settings") as any)
      .update({ settings, updated_at: new Date().toISOString() })
      .eq("organization_id", access.organizationId)
      .eq("provider", "alfabank");

    if (missing.length) {
      return NextResponse.json({
        ok: false,
        status: "error",
        message: `Заполните обязательные поля: ${missing.join(", ")}.`,
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      status: "ok",
      message: "Настройки выглядят корректно. Реальный тестовый платёж не выполнялся.",
    });
  } catch (error: any) {
    console.error("Alfabank settings check error:", error);
    return NextResponse.json({ ok: false, status: "error", message: error.message || "Не удалось проверить настройки" }, { status: 500 });
  }
}
