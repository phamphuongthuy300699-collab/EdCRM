import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import {
  AlfaStatusError,
  canFinanceUserCheckPayment,
  findAlfabankPayment,
  refreshAlfabankPaymentStatus,
  toPublicStatusResponse,
} from "@/lib/payments/alfabank/status-service";
import { checkRateLimit, rateLimitResponse, requestFingerprint } from "@/lib/security/rate-limit";

export const statusSchema = z.object({
  paymentId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  providerOrderId: z.string().optional(),
}).strict();

function jsonError(message: string, status = 400, code = "STATUS_CHECK_ERROR") {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

export async function POST(request: NextRequest) {
  if (process.env.PAYMENTS_EMERGENCY_DISABLED === "true") return jsonError("Онлайн-оплата временно отключена", 503, "PAYMENTS_EMERGENCY_DISABLED");
  const rate = checkRateLimit({ key: `payment-status:${requestFingerprint(request)}`, limit: 20, windowMs: 60_000 });
  if (!rate.allowed) return rateLimitResponse(rate);
  try {
    const parsed = statusSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("Некорректный идентификатор платежа, счета или заказа", 422, "INVALID_INPUT");
    }

    const { paymentId, invoiceId, providerOrderId } = parsed.data;
    if (!paymentId && !invoiceId && !providerOrderId) {
      return jsonError("Необходимо указать paymentId, invoiceId или providerOrderId", 400, "MISSING_INPUT");
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError("Необходима авторизация", 401, "UNAUTHORIZED");
    }

    const admin = createSupabaseAdminClient();
    const payment = await findAlfabankPayment(admin, { paymentId, invoiceId, providerOrderId });
    const hasAccess = await canFinanceUserCheckPayment(admin, user.id, payment.organization_id);
    if (!hasAccess) {
      return jsonError("Недостаточно прав для проверки статуса платежа", 403, "FORBIDDEN");
    }

    const result = await refreshAlfabankPaymentStatus(admin, payment, "manual_check");
    return NextResponse.json(toPublicStatusResponse(result));
  } catch (error) {
    console.error("[Alfabank Status Check]", { code: error instanceof AlfaStatusError ? error.code : "INTERNAL_ERROR" });
    if (error instanceof AlfaStatusError) {
      return jsonError(error.status < 500 ? error.message : "Не удалось проверить статус платежа", error.status, error.code);
    }
    return jsonError(
      "Внутренняя ошибка при проверке статуса",
      500,
      "INTERNAL_ERROR",
    );
  }
}
