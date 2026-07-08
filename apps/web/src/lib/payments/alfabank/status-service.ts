import { getAlfaOrderStatus } from "@/lib/payments/alfabank/client";
import { mapAlfaStatusToCrmStatus, redactSensitivePaymentPayload } from "@/lib/payments/alfabank/mapper";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isFinalPaymentStatus } from "@/shared/utils/payments";

const financeRoles = new Set(["owner", "admin", "manager", "accountant"]);

export type AlfaStatusLookup = {
  paymentId?: string;
  invoiceId?: string;
  providerOrderId?: string;
  orderId?: string;
};

export type AlfaStatusResult = {
  ok: true;
  status: string;
  message: string;
  paymentId: string;
  invoiceId: string;
};

export class AlfaStatusError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "STATUS_CHECK_ERROR") {
    super(message);
    this.name = "AlfaStatusError";
    this.status = status;
    this.code = code;
  }
}

function publicOrderId(input: AlfaStatusLookup) {
  return input.providerOrderId || input.orderId || "";
}

export async function findAlfabankPayment(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  input: AlfaStatusLookup,
) {
  const orderId = publicOrderId(input);
  let query = admin
    .from("payments")
    .select("id, organization_id, invoice_id, provider_order_id, status, amount, currency")
    .eq("provider", "alfabank");

  if (input.paymentId) {
    query = query.eq("id", input.paymentId);
  } else if (orderId) {
    query = query.eq("provider_order_id", orderId);
  } else if (input.invoiceId) {
    query = query.eq("invoice_id", input.invoiceId).order("created_at", { ascending: false }).limit(1);
  } else {
    throw new AlfaStatusError("Необходимо указать paymentId, invoiceId или orderId", 400, "MISSING_INPUT");
  }

  const { data: payment, error } = await (query as any).maybeSingle();
  if (error || !payment) {
    throw new AlfaStatusError("Платеж не найден", 404, "PAYMENT_NOT_FOUND");
  }

  if (input.invoiceId && payment.invoice_id !== input.invoiceId) {
    throw new AlfaStatusError("Платеж не относится к указанному счету", 403, "PAYMENT_INVOICE_MISMATCH");
  }

  if (orderId && payment.provider_order_id !== orderId) {
    throw new AlfaStatusError("Банковский идентификатор не относится к указанному платежу", 403, "PAYMENT_ORDER_MISMATCH");
  }

  if (!payment.provider_order_id) {
    throw new AlfaStatusError("У платежа отсутствует банковский идентификатор заказа", 400, "MISSING_PROVIDER_ORDER_ID");
  }

  return payment;
}

export async function canFinanceUserCheckPayment(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  organizationId: string,
) {
  const { data: membership } = await (admin.from("org_memberships") as any)
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  return Boolean(membership?.role && financeRoles.has(membership.role));
}

export async function canGuardianCheckPayment(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  payment: any,
) {
  const { data: invoice } = await (admin.from("invoices") as any)
    .select("id, organization_id, student_id, guardian_id")
    .eq("id", payment.invoice_id)
    .maybeSingle();

  if (!invoice || invoice.organization_id !== payment.organization_id) return false;

  const { data: guardianLinks } = await (admin.from("guardian_users") as any)
    .select("guardian_id")
    .eq("organization_id", payment.organization_id)
    .eq("user_id", userId);

  const guardianIds = new Set((guardianLinks || []).map((link: any) => link.guardian_id).filter(Boolean));
  if (invoice.guardian_id && guardianIds.has(invoice.guardian_id)) return true;
  if (!invoice.student_id || guardianIds.size === 0) return false;

  const { data: studentGuardian } = await (admin.from("student_guardians") as any)
    .select("id")
    .eq("organization_id", payment.organization_id)
    .eq("student_id", invoice.student_id)
    .in("guardian_id", Array.from(guardianIds))
    .maybeSingle();

  return Boolean(studentGuardian);
}

export async function verifyAnonymousReturnMatch(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  input: AlfaStatusLookup,
) {
  if (!input.paymentId || !input.invoiceId || !publicOrderId(input)) {
    throw new AlfaStatusError("Для проверки после возврата нужен paymentId, invoiceId и orderId", 403, "RETURN_IDENTIFIERS_REQUIRED");
  }

  await findAlfabankPayment(admin, input);
  return true;
}

export async function refreshAlfabankPaymentStatus(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  payment: any,
  source: "manual_check" | "return_check" | "callback",
): Promise<AlfaStatusResult> {
  const { data: settings, error: settingsError } = await (admin.from("payment_provider_settings") as any)
    .select("is_enabled, mode, api_login, api_password_secret, test_gateway_url, production_gateway_url, payment_stage, settings")
    .eq("organization_id", payment.organization_id)
    .eq("provider", "alfabank")
    .maybeSingle();

  if (settingsError || !settings?.is_enabled) {
    throw new AlfaStatusError("Настройки платежного шлюза неактивны или не найдены", 409, "ALFABANK_SETTINGS_UNAVAILABLE");
  }

  if (!settings.api_login || !settings.api_password_secret) {
    throw new AlfaStatusError("API реквизиты Альфа-Банка не настроены", 409, "ALFABANK_CREDENTIALS_MISSING");
  }

  const mode = (settings.mode === "production" ? "production" : "test") as "test" | "production";
  const gatewayUrl = mode === "production" ? settings.production_gateway_url : settings.test_gateway_url;
  const registerEndpoint =
    typeof settings.settings?.registerEndpoint === "string" ? settings.settings.registerEndpoint : undefined;

  const statusResponse = await getAlfaOrderStatus(payment.provider_order_id, {
    mode,
    gatewayUrl: gatewayUrl || "",
    registerEndpoint,
    apiLogin: settings.api_login,
    apiPassword: settings.api_password_secret,
    paymentStage: (settings.payment_stage === "two_step" ? "two_step" : "one_step") as "one_step" | "two_step",
  });

  const bankAmount = Number(statusResponse.amount);
  const expectedAmount = Math.round(Number(payment.amount) * 100);
  if (Number.isFinite(bankAmount) && bankAmount !== expectedAmount) {
    throw new AlfaStatusError("Сумма платежа в банке не совпадает с CRM", 400, "AMOUNT_MISMATCH");
  }

  const newStatus = mapAlfaStatusToCrmStatus(statusResponse.orderStatus);
  if (isFinalPaymentStatus(payment.status) && !isFinalPaymentStatus(newStatus)) {
    return {
      ok: true,
      message: "Статус платежа уже сохранен как окончательный",
      status: payment.status,
      paymentId: payment.id,
      invoiceId: payment.invoice_id,
    };
  }

  if (newStatus !== payment.status) {
    const nowStr = new Date().toISOString();
    const updateData: Record<string, any> = {
      status: newStatus,
      raw_response: redactSensitivePaymentPayload(statusResponse),
      updated_at: nowStr,
    };

    if (newStatus === "paid") {
      updateData.paid_at = nowStr;
    } else if (newStatus === "failed" || newStatus === "cancelled") {
      updateData.failed_at = nowStr;
    }

    const { error: paymentUpdateError } = await (admin.from("payments") as any)
      .update(updateData)
      .eq("id", payment.id);

    if (paymentUpdateError) {
      throw new AlfaStatusError("Не удалось обновить платеж", 500, "PAYMENT_UPDATE_FAILED");
    }

    if (newStatus === "paid") {
      await (admin.from("invoices") as any)
        .update({ status: "paid", paid_at: nowStr })
        .eq("id", payment.invoice_id);
    }

    if (newStatus === "paid" || newStatus === "failed" || newStatus === "cancelled") {
      await (admin.from("payment_events") as any).insert({
        organization_id: payment.organization_id,
        payment_id: payment.id,
        invoice_id: payment.invoice_id,
        provider: "alfabank",
        event_type: newStatus === "paid" ? "payment_paid" : "payment_failed",
        payload: redactSensitivePaymentPayload({ statusResponse, source }),
      });
    }
  }

  return {
    ok: true,
    message: "Статус платежа обновлен",
    status: newStatus,
    paymentId: payment.id,
    invoiceId: payment.invoice_id,
  };
}

export function toPublicStatusResponse(result: AlfaStatusResult) {
  return {
    ok: true,
    status: result.status,
    message: result.message,
  };
}
