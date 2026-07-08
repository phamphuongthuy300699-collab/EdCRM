import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import {
  AlfaStatusError,
  canGuardianCheckPayment,
  findAlfabankPayment,
  refreshAlfabankPaymentStatus,
  toPublicStatusResponse,
  verifyAnonymousReturnMatch,
} from "@/lib/payments/alfabank/status-service";

const returnStatusSchema = z.object({
  paymentId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  providerOrderId: z.string().optional(),
  orderId: z.string().optional(),
});

function jsonError(message: string, status = 400, code = "RETURN_STATUS_ERROR") {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

async function parsePayload(request: NextRequest) {
  if (request.method === "GET") {
    return {
      paymentId: request.nextUrl.searchParams.get("paymentId") || undefined,
      invoiceId: request.nextUrl.searchParams.get("invoiceId") || undefined,
      providerOrderId: request.nextUrl.searchParams.get("providerOrderId") || undefined,
      orderId: request.nextUrl.searchParams.get("orderId") || request.nextUrl.searchParams.get("mdOrder") || undefined,
    };
  }

  const body = await request.json().catch(() => ({}));
  return body;
}

async function handleReturnStatus(request: NextRequest) {
  try {
    const parsed = returnStatusSchema.safeParse(await parsePayload(request));
    if (!parsed.success) {
      return jsonError("Некорректные идентификаторы возврата с оплаты", 422, "INVALID_INPUT");
    }

    const input = parsed.data;
    if (!input.paymentId && !input.invoiceId && !input.providerOrderId && !input.orderId) {
      return jsonError("Необходимо указать данные платежа", 400, "MISSING_INPUT");
    }

    const admin = createSupabaseAdminClient();
    const payment = await findAlfabankPayment(admin, input);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const isGuardianPayment = await canGuardianCheckPayment(admin, user.id, payment);
      if (!isGuardianPayment) {
        await verifyAnonymousReturnMatch(admin, input);
      }
    } else {
      await verifyAnonymousReturnMatch(admin, input);
    }

    const result = await refreshAlfabankPaymentStatus(admin, payment, "return_check");
    return NextResponse.json(toPublicStatusResponse(result));
  } catch (error) {
    if (error instanceof AlfaStatusError) {
      return jsonError(error.message, error.status, error.code);
    }
    console.error("[Alfabank Return Status] Error:", error);
    return jsonError(
      error instanceof Error ? error.message : "Не удалось уточнить статус платежа",
      500,
      "INTERNAL_ERROR",
    );
  }
}

export async function GET(request: NextRequest) {
  return handleReturnStatus(request);
}

export async function POST(request: NextRequest) {
  return handleReturnStatus(request);
}
