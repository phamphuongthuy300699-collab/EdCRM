import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAlfaOrderStatus } from "@/lib/payments/alfabank/client";
import { mapAlfaStatusToCrmStatus } from "@/lib/payments/alfabank/mapper";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";

const bodySchema = z.object({
  paymentId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
});

const financeRoles = new Set(["owner", "admin", "manager", "accountant"]);

function jsonError(message: string, status = 400, code = "STATUS_CHECK_ERROR") {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Некорректный ID платежа или счета", 422, "INVALID_INPUT");
    }

    const { paymentId, invoiceId } = parsed.data;
    if (!paymentId && !invoiceId) {
      return jsonError("Необходимо указать paymentId или invoiceId", 400, "MISSING_INPUT");
    }

    // 1. Authenticate CRM user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("Необходима авторизация", 401, "UNAUTHORIZED");
    }

    const admin = createSupabaseAdminClient();

    // 2. Fetch payment details
    let paymentQuery = admin.from("payments").select("id, organization_id, invoice_id, provider_order_id, status, amount, currency");
    if (paymentId) {
      paymentQuery = paymentQuery.eq("id", paymentId);
    } else {
      paymentQuery = paymentQuery.eq("invoice_id", invoiceId).eq("provider", "alfabank").order("created_at", { ascending: false }).limit(1);
    }

    const { data: payment, error: paymentError } = await (paymentQuery as any).maybeSingle();

    if (paymentError || !payment) {
      return jsonError("Платеж не найден", 404, "PAYMENT_NOT_FOUND");
    }

    if (!payment.provider_order_id) {
      return jsonError("У этого платежа отсутствует банковский идентификатор заказа", 400, "MISSING_PROVIDER_ORDER_ID");
    }

    // 3. Verify CRM user membership & roles for payment's organization
    const { data: membership, error: membershipError } = await (admin.from("org_memberships") as any)
      .select("role")
      .eq("organization_id", payment.organization_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membershipError || !membership?.role || !financeRoles.has(membership.role)) {
      return jsonError("Недостаточно прав для проверки статуса платежа", 403, "FORBIDDEN");
    }

    // 4. Fetch Alfabank acquiring provider settings
    const { data: settings, error: settingsError } = await (admin.from("payment_provider_settings") as any)
      .select("is_enabled, mode, api_login, api_password_secret, test_gateway_url, production_gateway_url, payment_stage, settings")
      .eq("organization_id", payment.organization_id)
      .eq("provider", "alfabank")
      .maybeSingle();

    if (settingsError || !settings?.is_enabled) {
      return jsonError("Настройки платежного шлюза неактивны или не найдены", 409, "ALFABANK_SETTINGS_UNAVAILABLE");
    }

    if (!settings.api_login || !settings.api_password_secret) {
      return jsonError("API реквизиты Альфа-Банка не настроены", 409, "ALFABANK_CREDENTIALS_MISSING");
    }

    const mode = (settings.mode === "production" ? "production" : "test") as "test" | "production";
    const gatewayUrl = mode === "production" ? settings.production_gateway_url : settings.test_gateway_url;
    const registerEndpoint =
      typeof settings.settings?.registerEndpoint === "string" ? settings.settings.registerEndpoint : undefined;

    const config = {
      mode,
      gatewayUrl: gatewayUrl || "",
      registerEndpoint,
      apiLogin: settings.api_login,
      apiPassword: settings.api_password_secret,
      paymentStage: (settings.payment_stage === "two_step" ? "two_step" : "one_step") as "one_step" | "two_step",
    };

    // 5. Query bank API for real status
    const statusResponse = await getAlfaOrderStatus(payment.provider_order_id, config);
    const orderStatus = statusResponse.orderStatus;

    // 6. Verify amount to prevent fraud
    const bankAmount = Number(statusResponse.amount);
    const expectedAmount = Math.round(payment.amount * 100);
    if (Number.isFinite(bankAmount) && bankAmount !== expectedAmount) {
      return jsonError("Сумма платежа в банке не совпадает с CRM", 400, "AMOUNT_MISMATCH");
    }

    // 7. Map bank status to CRM status
    const newStatus = mapAlfaStatusToCrmStatus(orderStatus);

    // 8. Idempotency: paid or refunded payment cannot downgrade
    if (["paid", "refunded"].includes(payment.status) && !["paid", "refunded"].includes(newStatus)) {
      return NextResponse.json({
        ok: true,
        message: "Статус платежа в базе сохранен как окончательный",
        status: payment.status,
      });
    }

    // 9. Update DB status if changed
    if (newStatus !== payment.status) {
      const nowStr = new Date().toISOString();
      const updateData: Record<string, any> = {
        status: newStatus,
        raw_response: statusResponse,
      };

      if (newStatus === "paid") {
        updateData.paid_at = nowStr;
      } else if (newStatus === "failed" || newStatus === "cancelled") {
        updateData.failed_at = nowStr;
      }

      await (admin.from("payments") as any).update(updateData).eq("id", payment.id);

      // If transition to paid, update invoice as well
      if (newStatus === "paid") {
        await (admin.from("invoices") as any)
          .update({
            status: "paid",
            paid_at: nowStr,
          })
          .eq("id", payment.invoice_id);

        // Record successful event
        await (admin.from("payment_events") as any).insert({
          organization_id: payment.organization_id,
          payment_id: payment.id,
          invoice_id: payment.invoice_id,
          provider: "alfabank",
          event_type: "payment_paid",
          payload: { statusResponse, source: "manual_check" },
        });
      } else if (newStatus === "failed" || newStatus === "cancelled") {
        // Record failure event
        await (admin.from("payment_events") as any).insert({
          organization_id: payment.organization_id,
          payment_id: payment.id,
          invoice_id: payment.invoice_id,
          provider: "alfabank",
          event_type: "payment_failed",
          payload: { statusResponse, source: "manual_check" },
        });
      }
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (error) {
    console.error("[Alfabank Status Check] Error:", error);
    return jsonError(
      error instanceof Error ? error.message : "Внутренняя ошибка при проверке статуса",
      500,
      "INTERNAL_ERROR"
    );
  }
}
