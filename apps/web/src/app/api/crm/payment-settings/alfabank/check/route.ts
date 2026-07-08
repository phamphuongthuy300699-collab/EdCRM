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

async function assertGatewayDoesNotReturnHtml404(gatewayUrl: string) {
  const checkUrl = new URL("getOrderStatusExtended.do", gatewayUrl.endsWith("/") ? gatewayUrl : `${gatewayUrl}/`).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(checkUrl, { method: "GET", cache: "no-store", signal: controller.signal });
    const contentType = response.headers.get("content-type") || "";
    if (response.status === 404 && contentType.toLowerCase().includes("text/html")) {
      throw new Error(`Gateway ${gatewayUrl} возвращает HTML 404. Проверьте URL платежного шлюза.`);
    }
  } finally {
    clearTimeout(timeout);
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

    let gatewayError: string | null = null;
    if (!missing.length) {
      try {
        await assertGatewayDoesNotReturnHtml404(gatewayUrl);
      } catch (error: any) {
        gatewayError = error.message || "Gateway не прошел диагностическую проверку";
      }
    }

    const settings = {
      ...(data.settings || {}),
      lastCheckedAt: new Date().toISOString(),
      lastCheckStatus: missing.length || gatewayError ? "error" : "ok",
      lastCheckError: missing.length ? `Заполните обязательные поля: ${missing.join(", ")}` : gatewayError,
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

    if (gatewayError) {
      return NextResponse.json({
        ok: false,
        status: "error",
        message: gatewayError,
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      status: "ok",
      message: "Gateway доступен и не возвращает HTML 404. Реальный тестовый платеж не выполнялся.",
    });
  } catch (error: any) {
    console.error("Alfabank settings check error:", error);
    return NextResponse.json({ ok: false, status: "error", message: error.message || "Не удалось проверить настройки" }, { status: 500 });
  }
}
