import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoMode } from "@/shared/utils/demo";
import { requirePaymentAdmin } from "./_shared";

const gatewayUrl = z.string().url().optional().nullable().or(z.literal(""));
const pathValue = z.string().max(240).optional().nullable().or(z.literal(""));

const payloadSchema = z.object({
  organizationId: z.string().uuid().optional(),
  enabled: z.boolean(),
  mode: z.enum(["test", "production"]),
  apiLogin: z.string().max(160).optional().nullable(),
  apiPassword: z.string().max(240).optional().nullable(),
  testGatewayUrl: gatewayUrl,
  productionGatewayUrl: gatewayUrl,
  callbackPath: pathValue,
  successPath: pathValue,
  failPath: pathValue,
  currency: z.literal("RUB"),
  paymentStage: z.enum(["one_step", "two_step"]),
  sbpEnabled: z.boolean(),
  fiscalizationEnabled: z.boolean(),
  taxationSystem: z.string().max(80).optional().nullable(),
  vatRate: z.string().max(80).optional().nullable(),
});

type AlfabankSettingsResponse = {
  provider: "alfabank";
  is_enabled: boolean;
  mode: "test" | "production";
  api_login: string;
  test_gateway_url: string;
  production_gateway_url: string;
  callback_path: string;
  success_path: string;
  fail_path: string;
  currency: "RUB";
  payment_stage: "one_step" | "two_step";
  sbp_enabled: boolean;
  fiscalization_enabled: boolean;
  taxation_system: string;
  vat_rate: string;
  settings: Record<string, unknown>;
};

function defaultSettings(): AlfabankSettingsResponse {
  return {
    provider: "alfabank",
    is_enabled: false,
    mode: "test",
    api_login: "",
    test_gateway_url: "https://web.rbsuat.com/ab/rest/",
    production_gateway_url: "https://engine.paymentgate.ru/payment/rest/",
    callback_path: "/api/payments/alfabank/callback",
    success_path: "/parent/payments?payment=success",
    fail_path: "/parent/payments?payment=fail",
    currency: "RUB",
    payment_stage: "one_step",
    sbp_enabled: false,
    fiscalization_enabled: false,
    taxation_system: "",
    vat_rate: "none",
    settings: {},
  };
}

function sanitizeSettings(row: any): AlfabankSettingsResponse {
  const fallback = defaultSettings();
  return {
    provider: "alfabank",
    is_enabled: Boolean(row?.is_enabled),
    mode: row?.mode === "production" ? "production" : "test",
    api_login: row?.api_login || "",
    test_gateway_url: row?.test_gateway_url || fallback.test_gateway_url,
    production_gateway_url: row?.production_gateway_url || fallback.production_gateway_url,
    callback_path: row?.callback_path || fallback.callback_path,
    success_path: row?.success_path || row?.return_url || fallback.success_path,
    fail_path: row?.fail_path || row?.fail_url || fallback.fail_path,
    currency: "RUB",
    payment_stage: row?.payment_stage === "two_step" ? "two_step" : "one_step",
    sbp_enabled: Boolean(row?.sbp_enabled),
    fiscalization_enabled: Boolean(row?.fiscalization_enabled),
    taxation_system: row?.taxation_system || "",
    vat_rate: row?.vat_rate || "none",
    settings: row?.settings || {},
  };
}

export async function GET() {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ ok: true, settings: defaultSettings(), passwordConfigured: false });
    }

    const access = await requirePaymentAdmin();
    if (!access.ok) return access.response;

    const admin = createSupabaseAdminClient();
    const { data, error } = await (admin.from("payment_provider_settings") as any)
      .select("*")
      .eq("organization_id", access.organizationId)
      .eq("provider", "alfabank")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      settings: sanitizeSettings(data),
      passwordConfigured: Boolean(data?.api_password_secret),
    });
  } catch (error: any) {
    console.error("Alfabank settings load error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Не удалось загрузить настройки Альфа-Банка" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = payloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Некорректные настройки Альфа-Банка", details: parsed.error.format() }, { status: 400 });
    }

    if (isDemoMode()) {
      return NextResponse.json({ ok: true, passwordConfigured: Boolean(parsed.data.apiPassword) });
    }

    const access = await requirePaymentAdmin();
    if (!access.ok) return access.response;

    const input = parsed.data;
    const organizationId = input.organizationId || access.organizationId;
    const admin = createSupabaseAdminClient();

    const { data: current, error: currentError } = await (admin.from("payment_provider_settings") as any)
      .select("api_password_secret")
      .eq("organization_id", organizationId)
      .eq("provider", "alfabank")
      .maybeSingle();
    if (currentError) throw currentError;

    const password = input.apiPassword?.trim() ? input.apiPassword.trim() : current?.api_password_secret || null;

    const { error } = await (admin.from("payment_provider_settings") as any).upsert(
      {
        organization_id: organizationId,
        provider: "alfabank",
        is_enabled: input.enabled,
        mode: input.mode,
        api_login: input.apiLogin?.trim() || null,
        api_password_secret: password,
        test_gateway_url: input.testGatewayUrl || null,
        production_gateway_url: input.productionGatewayUrl || null,
        callback_path: input.callbackPath || null,
        success_path: input.successPath || null,
        fail_path: input.failPath || null,
        return_url: input.successPath || null,
        fail_url: input.failPath || null,
        webhook_url: input.callbackPath || null,
        currency: "RUB",
        payment_stage: input.paymentStage,
        sbp_enabled: input.sbpEnabled,
        fiscalization_enabled: input.fiscalizationEnabled,
        taxation_system: input.taxationSystem || null,
        vat_rate: input.vatRate || null,
        settings: {
          lastSavedAt: new Date().toISOString(),
          passwordConfigured: Boolean(password),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,provider" },
    );
    if (error) throw error;

    return NextResponse.json({ ok: true, passwordConfigured: Boolean(password) });
  } catch (error: any) {
    console.error("Alfabank settings save error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Не удалось сохранить настройки Альфа-Банка" }, { status: 500 });
  }
}
