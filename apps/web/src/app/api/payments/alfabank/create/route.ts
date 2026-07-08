import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAlfaOrder } from "@/lib/payments/alfabank/client";
import { alfaErrorMessage, AlfaBankError } from "@/lib/payments/alfabank/errors";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { redactSensitivePaymentPayload } from "@/lib/payments/alfabank/mapper";
import { shouldReuseAlfabankPaymentUrl } from "@/shared/utils/payments";

const bodySchema = z.object({
  invoiceId: z.string().uuid(),
});

const financeRoles = new Set(["owner", "admin", "manager", "accountant"]);
const reusablePaymentStatuses = ["pending", "redirected", "authorized"];
const activePaymentRetryDelayMs = 350;
const activePaymentRetryAttempts = 3;

function jsonError(message: string, status = 400, code = "PAYMENT_ERROR") {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

const blockedProductionHosts = new Set(["0.0.0.0", "localhost", "127.0.0.1"]);

export function buildPaymentReturnUrl(pathOrUrl: string | null | undefined, input: {
  requestOrigin: string;
  invoiceId: string;
  paymentId: string;
  publicAppUrl?: string;
  appUrl?: string;
  nodeEnv?: string;
}) {
  const configuredOrigin = input.publicAppUrl?.trim() || input.appUrl?.trim() || "";
  const origin = configuredOrigin || input.requestOrigin;
  const originUrl = new URL(origin);
  const assertPublicProductionUrl = (url: URL) => {
    if (input.nodeEnv === "production" && blockedProductionHosts.has(url.hostname)) {
      throw new AlfaBankError("Для онлайн-оплаты в production задайте NEXT_PUBLIC_APP_URL или APP_URL с публичным доменом", {
        code: "PUBLIC_APP_URL_NOT_CONFIGURED",
      });
    }
  };
  assertPublicProductionUrl(originUrl);
  const fallbackPath = "/payments/success";
  const raw = pathOrUrl?.trim() || fallbackPath;
  const url = raw.startsWith("http://") || raw.startsWith("https://")
    ? new URL(raw)
    : new URL(raw.startsWith("/") ? raw : `/${raw}`, originUrl);
  assertPublicProductionUrl(url);

  url.searchParams.set("invoiceId", input.invoiceId);
  url.searchParams.set("paymentId", input.paymentId);
  return url.toString();
}

function absoluteUrl(pathOrUrl: string | null | undefined, request: NextRequest, invoiceId: string, paymentId: string) {
  return buildPaymentReturnUrl(pathOrUrl, {
    requestOrigin: request.nextUrl.origin,
    invoiceId,
    paymentId,
    publicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    appUrl: process.env.APP_URL,
    nodeEnv: process.env.NODE_ENV,
  });
}

function parseAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function safeBankFailureDetails(error: unknown) {
  if (error instanceof AlfaBankError) return error.details ?? { code: error.code, status: error.status };
  if (error instanceof Error) return { message: error.message };
  return { message: "Unknown payment error" };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findActiveAlfabankPayment(admin: ReturnType<typeof createSupabaseAdminClient>, invoiceId: string) {
  const { data } = await (admin.from("payments") as any)
    .select("id, payment_url, status, created_at")
    .eq("invoice_id", invoiceId)
    .eq("provider", "alfabank")
    .in("status", reusablePaymentStatuses)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

async function waitForActivePaymentUrl(admin: ReturnType<typeof createSupabaseAdminClient>, invoiceId: string) {
  for (let attempt = 0; attempt < activePaymentRetryAttempts; attempt += 1) {
    const activePayment = await findActiveAlfabankPayment(admin, invoiceId);
    if (shouldReuseAlfabankPaymentUrl(activePayment)) return activePayment;
    if (!activePayment) return null;
    if (attempt < activePaymentRetryAttempts - 1) await delay(activePaymentRetryDelayMs);
  }

  return findActiveAlfabankPayment(admin, invoiceId);
}

async function canUserPayInvoice(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string, invoice: any) {
  const { data: membership } = await (admin.from("org_memberships") as any)
    .select("role")
    .eq("organization_id", invoice.organization_id)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (membership?.role && financeRoles.has(membership.role)) {
    return true;
  }

  const { data: guardianLinks } = await (admin.from("guardian_users") as any)
    .select("guardian_id")
    .eq("organization_id", invoice.organization_id)
    .eq("user_id", userId);

  const guardianIds = new Set((guardianLinks || []).map((link: any) => link.guardian_id).filter(Boolean));
  if (invoice.guardian_id && guardianIds.has(invoice.guardian_id)) return true;

  if (!invoice.student_id || guardianIds.size === 0) return false;

  const { data: studentGuardian } = await (admin.from("student_guardians") as any)
    .select("id")
    .eq("organization_id", invoice.organization_id)
    .eq("student_id", invoice.student_id)
    .in("guardian_id", Array.from(guardianIds))
    .maybeSingle();

  return Boolean(studentGuardian);
}

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Некорректный invoiceId", 422, "INVALID_INVOICE_ID");
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("Необходима авторизация", 401, "UNAUTHORIZED");
    }

    const admin = createSupabaseAdminClient();
    const { invoiceId } = parsed.data;

    const { data: invoice, error: invoiceError } = await (admin.from("invoices") as any)
      .select("id, organization_id, student_id, guardian_id, enrollment_id, number, title, description, amount, currency, status")
      .eq("id", invoiceId)
      .maybeSingle();

    if (invoiceError) {
      return jsonError("Не удалось загрузить счет", 500, "INVOICE_READ_FAILED");
    }

    if (!invoice) {
      return jsonError("Счет не найден", 404, "INVOICE_NOT_FOUND");
    }

    const hasAccess = await canUserPayInvoice(admin, user.id, invoice);
    if (!hasAccess) {
      return jsonError("Нет доступа к оплате этого счета", 403, "FORBIDDEN");
    }

    if (["paid", "cancelled"].includes(invoice.status)) {
      return jsonError("Этот счет уже оплачен или отменен", 409, "INVOICE_NOT_PAYABLE");
    }

    const amount = parseAmount(invoice.amount);
    if (amount <= 0) {
      return jsonError("У счета некорректная сумма", 422, "INVALID_INVOICE_AMOUNT");
    }

    if (invoice.currency && invoice.currency !== "RUB") {
      return jsonError("Онлайн-оплата доступна только для счетов в RUB", 422, "UNSUPPORTED_CURRENCY");
    }

    const existingPayment = await findActiveAlfabankPayment(admin, invoice.id);

    if (shouldReuseAlfabankPaymentUrl(existingPayment)) {
      return NextResponse.json({ ok: true, paymentUrl: existingPayment.payment_url, reused: true });
    }

    if (existingPayment) {
      const activePayment = await waitForActivePaymentUrl(admin, invoice.id);
      if (shouldReuseAlfabankPaymentUrl(activePayment)) {
        return NextResponse.json({ ok: true, paymentUrl: activePayment.payment_url, reused: true });
      }
      return jsonError("Ссылка на оплату уже формируется. Повторите через несколько секунд.", 409, "PAYMENT_LINK_PROCESSING");
    }

    const { data: settings, error: settingsError } = await (admin.from("payment_provider_settings") as any)
      .select("is_enabled, mode, api_login, api_password_secret, test_gateway_url, production_gateway_url, callback_path, success_path, fail_path, payment_stage, settings")
      .eq("organization_id", invoice.organization_id)
      .eq("provider", "alfabank")
      .maybeSingle();

    if (settingsError) {
      return jsonError("Не удалось загрузить настройки Альфа-Банка", 500, "PAYMENT_SETTINGS_READ_FAILED");
    }

    if (!settings?.is_enabled) {
      return jsonError("Онлайн-оплата Альфа-Банк выключена в настройках", 409, "ALFABANK_DISABLED");
    }

    if (!settings.api_login || !settings.api_password_secret) {
      return jsonError("В настройках Альфа-Банка не заданы API login/password", 409, "ALFABANK_CREDENTIALS_MISSING");
    }

    const mode = settings.mode === "production" ? "production" : "test";
    const gatewayUrl = mode === "production" ? settings.production_gateway_url : settings.test_gateway_url;
    const registerEndpoint =
      typeof settings.settings?.registerEndpoint === "string" ? settings.settings.registerEndpoint : undefined;
    const currencyCode =
      typeof settings.settings?.alfabankCurrencyCode === "string" ? settings.settings.alfabankCurrencyCode :
      typeof settings.settings?.currencyCode === "string" ? settings.settings.currencyCode :
      undefined;
    const useDynamicCallback = settings.settings?.dynamicCallbackEnabled === true;

    const { data: payment, error: paymentError } = await (admin.from("payments") as any)
      .insert({
        organization_id: invoice.organization_id,
        invoice_id: invoice.id,
        student_id: invoice.student_id,
        guardian_id: invoice.guardian_id,
        provider: "alfabank",
        status: "pending",
        amount,
        currency: "RUB",
        raw_request: {
          invoiceId: invoice.id,
          requestedBy: user.id,
          mode,
        },
      })
      .select("id")
      .single();

    if (paymentError || !payment) {
      if (paymentError?.code === "23505") {
        const activePayment = await waitForActivePaymentUrl(admin, invoice.id);
        if (shouldReuseAlfabankPaymentUrl(activePayment)) {
          return NextResponse.json({ ok: true, paymentUrl: activePayment.payment_url, reused: true });
        }
        return jsonError("Ссылка на оплату уже формируется. Повторите через несколько секунд.", 409, "PAYMENT_LINK_PROCESSING");
      }
      return jsonError("Не удалось создать запись платежа: " + (paymentError?.message || ""), 500, "PAYMENT_CREATE_FAILED");
    }

    const orderNumber = `${invoice.number || `INV-${invoice.id.slice(0, 8)}`}-${payment.id.slice(0, 8)}`;
    const description = invoice.description || invoice.title || `Счет ${invoice.number || invoice.id}`;

    try {
      const result = await createAlfaOrder(
        {
          invoiceId: invoice.id,
          amount,
          currency: "RUB",
          currencyCode,
          description,
          orderNumber,
          returnUrl: absoluteUrl(settings.success_path || "/payments/success", request, invoice.id, payment.id),
          failUrl: absoluteUrl(settings.fail_path || "/payments/fail", request, invoice.id, payment.id),
          dynamicCallbackUrl: useDynamicCallback
            ? absoluteUrl(settings.callback_path || "/api/payments/alfabank/callback", request, invoice.id, payment.id)
            : undefined,
        },
        {
          mode,
          gatewayUrl,
          registerEndpoint,
          apiLogin: settings.api_login,
          apiPassword: settings.api_password_secret,
          currencyCode,
          paymentStage: settings.payment_stage === "two_step" ? "two_step" : "one_step",
        },
      );

      await (admin.from("payments") as any)
        .update({
          status: "redirected",
          provider_order_id: result.providerOrderId,
          provider_payment_id: result.providerOrderId,
          payment_url: result.paymentUrl,
          raw_request: redactSensitivePaymentPayload({ ...result.rawRequest, endpoint: result.endpoint }),
          raw_response: redactSensitivePaymentPayload(result.rawResponse),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      await (admin.from("payment_events") as any).insert({
        organization_id: invoice.organization_id,
        payment_id: payment.id,
        invoice_id: invoice.id,
        provider: "alfabank",
        event_type: "register",
        payload: {
          providerOrderId: result.providerOrderId,
          paymentUrl: result.paymentUrl,
          mode,
        },
      });

      return NextResponse.json({ ok: true, paymentUrl: result.paymentUrl });
    } catch (error) {
      await (admin.from("payments") as any)
        .update({
          status: "failed",
          failed_at: new Date().toISOString(),
          raw_response: safeBankFailureDetails(error),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      await (admin.from("payment_events") as any).insert({
        organization_id: invoice.organization_id,
        payment_id: payment.id,
        invoice_id: invoice.id,
        provider: "alfabank",
        event_type: "register_failed",
        payload: safeBankFailureDetails(error),
      });

      return jsonError(alfaErrorMessage(error), 502, error instanceof AlfaBankError ? error.code : "ALFABANK_REGISTER_FAILED");
    }
  } catch (error) {
    return jsonError(alfaErrorMessage(error), 500, "PAYMENT_CREATE_UNEXPECTED_ERROR");
  }
}
