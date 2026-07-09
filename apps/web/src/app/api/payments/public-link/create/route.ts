import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAlfaOrder } from "@/lib/payments/alfabank/client";
import { alfaErrorMessage, AlfaBankError } from "@/lib/payments/alfabank/errors";
import { redactSensitivePaymentPayload } from "@/lib/payments/alfabank/mapper";
import { verifyInvoicePaymentToken } from "@/lib/payments/invoice-payment-links";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { shouldReuseAlfabankPaymentUrl } from "@/shared/utils/payments";
import { buildPaymentReturnUrl } from "../../alfabank/create/route";

const bodySchema = z.object({
  token: z.string().min(32),
});

const reusablePaymentStatuses = ["pending", "redirected", "authorized"];

function jsonError(message: string, status = 400, code = "PAY_LINK_PAYMENT_ERROR") {
  return NextResponse.json({ ok: false, error: message, code }, { status });
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

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Некорректная ссылка оплаты", 422, "INVALID_PAY_TOKEN");
    }

    const { invoice } = await verifyInvoicePaymentToken(parsed.data.token);
    if (["paid", "cancelled"].includes(invoice.status)) {
      return jsonError(invoice.status === "paid" ? "Счет уже оплачен" : "Счет отменен", 409, "INVOICE_NOT_PAYABLE");
    }

    const amount = parseAmount(invoice.amount);
    if (amount <= 0) {
      return jsonError("У счета некорректная сумма", 422, "INVALID_INVOICE_AMOUNT");
    }

    if (invoice.currency && invoice.currency !== "RUB") {
      return jsonError("Онлайн-оплата доступна только для счетов в RUB", 422, "UNSUPPORTED_CURRENCY");
    }

    const admin = createSupabaseAdminClient();
    const existingPayment = await findActiveAlfabankPayment(admin, invoice.id);
    if (shouldReuseAlfabankPaymentUrl(existingPayment)) {
      return NextResponse.json({ ok: true, paymentUrl: existingPayment.payment_url, reused: true });
    }

    const { data: settings, error: settingsError } = await (admin.from("payment_provider_settings") as any)
      .select("is_enabled, mode, api_login, api_password_secret, test_gateway_url, production_gateway_url, callback_path, success_path, fail_path, payment_stage, settings")
      .eq("organization_id", invoice.organization_id)
      .eq("provider", "alfabank")
      .maybeSingle();

    if (settingsError) return jsonError("Не удалось загрузить настройки Альфа-Банка", 500, "PAYMENT_SETTINGS_READ_FAILED");
    if (!settings?.is_enabled) return jsonError("Онлайн-оплата Альфа-Банк выключена", 409, "ALFABANK_DISABLED");
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
          requestedBy: "public-pay-link",
          mode,
        },
      })
      .select("id")
      .single();

    if (paymentError || !payment) {
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
        event_type: "public_link_register",
        payload: { providerOrderId: result.providerOrderId, mode },
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

      return jsonError(alfaErrorMessage(error), 502, error instanceof AlfaBankError ? error.code : "ALFABANK_REGISTER_FAILED");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("PAY_LINK_")) {
      return jsonError("Ссылка оплаты недействительна или устарела", 404, error.message);
    }
    return jsonError(alfaErrorMessage(error), 500, "PAY_LINK_PAYMENT_UNEXPECTED_ERROR");
  }
}
