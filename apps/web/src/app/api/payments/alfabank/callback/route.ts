import { NextRequest, NextResponse } from "next/server";
import { getAlfaOrderStatus } from "@/lib/payments/alfabank/client";
import { mapAlfaStatusToCrmStatus, redactSensitivePaymentPayload } from "@/lib/payments/alfabank/mapper";
import { AlfaBankError } from "@/lib/payments/alfabank/errors";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";

function jsonError(message: string, status = 400, code = "CALLBACK_ERROR") {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

async function processCallback(request: NextRequest) {
  const admin = createSupabaseAdminClient();
  let rawPayload: Record<string, any> = {};

  // 1. Extract parameters from query string
  for (const [key, val] of request.nextUrl.searchParams.entries()) {
    rawPayload[key] = val;
  }

  // 2. Extract parameters from request body (if POST)
  if (request.method === "POST") {
    try {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await request.json();
        rawPayload = { ...rawPayload, ...json };
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const text = await request.text();
        const params = new URLSearchParams(text);
        for (const [key, val] of params.entries()) {
          rawPayload[key] = val;
        }
      }
    } catch (e) {
      console.error("[Alfabank Callback] Failed to parse body:", e);
    }
  }

  // 3. Find order ID (mdOrder is standard Alfabank unique order ID)
  const mdOrder = rawPayload.mdOrder || rawPayload.orderId;
  const orderNumber = rawPayload.orderNumber;

  if (!mdOrder && !orderNumber) {
    return jsonError("Missing mdOrder or orderNumber in webhook payload", 400, "MISSING_ORDER_ID");
  }

  // 4. Find payment record in our database
  let query = admin.from("payments").select("id, organization_id, invoice_id, provider_order_id, status, amount, currency");
  if (mdOrder) {
    query = query.eq("provider_order_id", mdOrder);
  } else {
    query = query.eq("id", orderNumber);
  }

  const { data: payment, error: paymentError } = await (query as any).maybeSingle();

  if (paymentError || !payment) {
    console.error("[Alfabank Callback] Payment not found for:", { mdOrder, orderNumber });
    return jsonError("Payment not found", 404, "PAYMENT_NOT_FOUND");
  }

  // 5. Save incoming raw payload to payment_events
  await (admin.from("payment_events") as any).insert({
    organization_id: payment.organization_id,
    payment_id: payment.id,
    invoice_id: payment.invoice_id,
    provider: "alfabank",
    event_type: "callback_received",
    payload: redactSensitivePaymentPayload(rawPayload),
  });

  // 6. Idempotency check: if payment is already completed or refunded, do not process again
  if (payment.status === "paid" || payment.status === "refunded") {
    return NextResponse.json({ ok: true, message: "Payment already processed", status: payment.status });
  }

  // 7. Load Alfabank gateway settings for this organization
  const { data: settings, error: settingsError } = await (admin.from("payment_provider_settings") as any)
    .select("is_enabled, mode, api_login, api_password_secret, test_gateway_url, production_gateway_url, payment_stage, settings")
    .eq("organization_id", payment.organization_id)
    .eq("provider", "alfabank")
    .maybeSingle();

  if (settingsError || !settings?.is_enabled) {
    return jsonError("Acquiring provider settings disabled or unavailable", 409, "ALFABANK_SETTINGS_UNAVAILABLE");
  }

  if (!settings.api_login || !settings.api_password_secret) {
    return jsonError("API credentials not configured", 409, "ALFABANK_CREDENTIALS_MISSING");
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

  // 8. Fetch real status directly from Alfabank to prevent spoofing
  let statusResponse;
  try {
    statusResponse = await getAlfaOrderStatus(mdOrder || payment.provider_order_id, config);
  } catch (error) {
    console.error("[Alfabank Callback] Direct status check failed:", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to verify payment status with bank",
      502,
      "ALFABANK_STATUS_VERIFICATION_FAILED"
    );
  }

  // 9. Verify amount to prevent fraud
  const bankAmount = Number(statusResponse.amount);
  const expectedAmount = Math.round(payment.amount * 100);
  if (Number.isFinite(bankAmount) && bankAmount !== expectedAmount) {
    console.error("[Alfabank Callback] Amount mismatch:", { bankAmount, expectedAmount, paymentId: payment.id });
    return jsonError("Payment amount mismatch", 400, "AMOUNT_MISMATCH");
  }

  // 10. Map bank status to CRM status
  const newStatus = mapAlfaStatusToCrmStatus(statusResponse.orderStatus);

  // 11. Update database records
  const nowStr = new Date().toISOString();
  const updateData: Record<string, any> = {
    status: newStatus,
    raw_response: redactSensitivePaymentPayload(statusResponse),
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
    console.error("[Alfabank Callback] Failed to update payment:", paymentUpdateError);
    return jsonError("Database update failed", 500, "DATABASE_UPDATE_FAILED");
  }

  // If transition to paid, update invoice as well
  if (newStatus === "paid") {
    const { error: invoiceUpdateError } = await (admin.from("invoices") as any)
      .update({
        status: "paid",
        paid_at: nowStr,
      })
      .eq("id", payment.invoice_id);

    if (invoiceUpdateError) {
      console.error("[Alfabank Callback] Failed to update invoice status:", invoiceUpdateError);
    }

    // Log success event
    await (admin.from("payment_events") as any).insert({
      organization_id: payment.organization_id,
      payment_id: payment.id,
      invoice_id: payment.invoice_id,
      provider: "alfabank",
      event_type: "payment_paid",
      payload: redactSensitivePaymentPayload({ statusResponse }),
    });
  } else if (newStatus === "failed" || newStatus === "cancelled") {
    // Log failure event
    await (admin.from("payment_events") as any).insert({
      organization_id: payment.organization_id,
      payment_id: payment.id,
      invoice_id: payment.invoice_id,
      provider: "alfabank",
      event_type: "payment_failed",
      payload: redactSensitivePaymentPayload({ statusResponse }),
    });
  }

  return NextResponse.json({ ok: true, status: newStatus });
}

export async function GET(request: NextRequest) {
  return processCallback(request);
}

export async function POST(request: NextRequest) {
  return processCallback(request);
}
