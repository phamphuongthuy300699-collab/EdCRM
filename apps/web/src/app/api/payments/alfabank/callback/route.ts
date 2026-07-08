import { NextRequest, NextResponse } from "next/server";
import { redactSensitivePaymentPayload } from "@/lib/payments/alfabank/mapper";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isFinalPaymentStatus } from "@/shared/utils/payments";
import {
  AlfaStatusError,
  findAlfabankPayment,
  refreshAlfabankPaymentStatus,
  toPublicStatusResponse,
} from "@/lib/payments/alfabank/status-service";

function jsonError(message: string, status = 400, code = "CALLBACK_ERROR") {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

async function collectPayload(request: NextRequest) {
  let payload: Record<string, any> = {};
  for (const [key, val] of request.nextUrl.searchParams.entries()) {
    payload[key] = val;
  }

  if (request.method !== "POST") return payload;

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = { ...payload, ...(await request.json()) };
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(await request.text());
      for (const [key, val] of params.entries()) {
        payload[key] = val;
      }
    }
  } catch (error) {
    console.error("[Alfabank Callback] Failed to parse body:", error);
  }

  return payload;
}

async function processCallback(request: NextRequest) {
  const admin = createSupabaseAdminClient();
  const rawPayload = await collectPayload(request);
  const orderId = rawPayload.mdOrder || rawPayload.orderId;
  const orderNumber = rawPayload.orderNumber;

  if (!orderId && !orderNumber) {
    return jsonError("Missing mdOrder or orderNumber in webhook payload", 400, "MISSING_ORDER_ID");
  }

  try {
    const payment = await findAlfabankPayment(admin, {
      providerOrderId: orderId,
      paymentId: orderNumber,
    });

    await (admin.from("payment_events") as any).insert({
      organization_id: payment.organization_id,
      payment_id: payment.id,
      invoice_id: payment.invoice_id,
      provider: "alfabank",
      event_type: "callback_received",
      payload: redactSensitivePaymentPayload(rawPayload),
    });

    if (isFinalPaymentStatus(payment.status)) {
      return NextResponse.json({ ok: true, message: "Payment already processed", status: payment.status });
    }

    const result = await refreshAlfabankPaymentStatus(admin, payment, "callback");
    return NextResponse.json(toPublicStatusResponse(result));
  } catch (error) {
    if (error instanceof AlfaStatusError) {
      if (error.code === "PAYMENT_NOT_FOUND") {
        console.error("[Alfabank Callback] Payment not found for:", { orderId, orderNumber });
      }
      return jsonError(error.message, error.status, error.code);
    }

    console.error("[Alfabank Callback] Error:", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to verify payment status with bank",
      502,
      "ALFABANK_STATUS_VERIFICATION_FAILED",
    );
  }
}

export async function GET(request: NextRequest) {
  return processCallback(request);
}

export async function POST(request: NextRequest) {
  return processCallback(request);
}
