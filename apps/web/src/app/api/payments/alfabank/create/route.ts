import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAlfaOrder } from "@/lib/payments/alfabank/client";
import { alfaErrorMessage, AlfaBankError } from "@/lib/payments/alfabank/errors";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { redactSensitivePaymentPayload } from "@/lib/payments/alfabank/mapper";

const bodySchema = z.object({
  invoiceId: z.string().uuid(),
});

const financeRoles = new Set(["owner", "admin", "manager", "accountant"]);
const reusablePaymentStatuses = ["pending", "redirected", "authorized"];
const reusablePaymentTtlMs = 30 * 60 * 1000;

function jsonError(message: string, status = 400, code = "PAYMENT_ERROR") {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

function absoluteUrl(pathOrUrl: string | null | undefined, request: NextRequest, invoiceId: string) {
  const origin = request.nextUrl.origin;
  const fallbackPath = "/parent/payments";
  const raw = pathOrUrl?.trim() || fallbackPath;
  const url = raw.startsWith("http://") || raw.startsWith("https://")
    ? new URL(raw)
    : new URL(raw.startsWith("/") ? raw : `/${raw}`, origin);

  url.searchParams.set("invoiceId", invoiceId);
  return url.toString();
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

    const { data: existingPayment } = await (admin.from("payments") as any)
      .select("id, payment_url, status, created_at")
      .eq("invoice_id", invoice.id)
      .eq("provider", "alfabank")
      .in("status", reusablePaymentStatuses)
      .not("payment_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      existingPayment?.payment_url &&
      existingPayment.created_at &&
      Date.now() - new Date(existingPayment.created_at).getTime() < reusablePaymentTtlMs
    ) {
      return NextResponse.json({ ok: true, paymentUrl: existingPayment.payment_url, reused: true });
    }

    const { data: settings, error: settingsError } = await (admin.from("payment_provider_settings") as any)
      .select("is_enabled, mode, api_login, api_password_secret, test_gateway_url, production_gateway_url, success_path, fail_path, payment_stage, settings")
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
      return jsonError("Не удалось создать запись платежа", 500, "PAYMENT_CREATE_FAILED");
    }

    const orderNumber = `${invoice.number || `INV-${invoice.id.slice(0, 8)}`}-${payment.id.slice(0, 8)}`;
    const description = invoice.description || invoice.title || `Счет ${invoice.number || invoice.id}`;

    try {
      const result = await createAlfaOrder(
        {
          invoiceId: invoice.id,
          amount,
          currency: "RUB",
          description,
          orderNumber,
          returnUrl: absoluteUrl(settings.success_path, request, invoice.id),
          failUrl: absoluteUrl(settings.fail_path, request, invoice.id),
        },
        {
          mode,
          gatewayUrl,
          registerEndpoint,
          apiLogin: settings.api_login,
          apiPassword: settings.api_password_secret,
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
