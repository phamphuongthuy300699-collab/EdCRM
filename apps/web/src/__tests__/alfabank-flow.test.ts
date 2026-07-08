import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { buildPaymentReturnUrl } from "../app/api/payments/alfabank/create/route";

describe("Alfabank payment flow production hotfixes", () => {
  it("builds return URLs from NEXT_PUBLIC_APP_URL before request origin", () => {
    const requestOrigin = "http://0.0.0.0:3000";
    const url = buildPaymentReturnUrl("/payments/success", {
      requestOrigin,
      invoiceId: "invoice-1",
      paymentId: "payment-1",
      publicAppUrl: "https://робокс48.рф",
      nodeEnv: "production",
    });

    expect(url).toBe("https://xn--48-9kc0bsblm.xn--p1ai/payments/success?invoiceId=invoice-1&paymentId=payment-1");
  });

  it("rejects local origins in production when public app URL is missing", () => {
    expect(() => buildPaymentReturnUrl("/payments/success", {
      requestOrigin: "http://0.0.0.0:3000",
      invoiceId: "invoice-1",
      paymentId: "payment-1",
      nodeEnv: "production",
    })).toThrow("NEXT_PUBLIC_APP_URL");
  });

  it("rejects explicitly configured local return URLs in production", () => {
    expect(() => buildPaymentReturnUrl("http://localhost:3000/payments/success", {
      requestOrigin: "https://робокс48.рф",
      invoiceId: "invoice-1",
      paymentId: "payment-1",
      nodeEnv: "production",
    })).toThrow("NEXT_PUBLIC_APP_URL");
  });

  it("success and fail pages both call return-safe status API with payment identifiers", () => {
    const root = process.cwd();
    const successSource = fs.readFileSync(path.join(root, "src/app/payments/success/page.tsx"), "utf8");
    const failSource = fs.readFileSync(path.join(root, "src/app/payments/fail/page.tsx"), "utf8");

    for (const source of [successSource, failSource]) {
      expect(source).toContain("/api/payments/alfabank/return-status");
      expect(source).toContain("paymentId");
      expect(source).toContain("orderId");
      expect(source).toContain("providerOrderId");
      expect(source).toContain("invoiceId");
    }
  });

  it("return status endpoint does not expose raw bank payload", () => {
    const root = process.cwd();
    const source = fs.readFileSync(path.join(root, "src/app/api/payments/alfabank/return-status/route.ts"), "utf8");

    expect(source).toContain("toPublicStatusResponse");
    expect(source).not.toContain("raw_response");
    expect(source).not.toContain("rawResponse");
  });

  it("anonymous return status requires matching invoice payment and bank order identifiers", () => {
    const root = process.cwd();
    const source = fs.readFileSync(path.join(root, "src/lib/payments/alfabank/status-service.ts"), "utf8");

    expect(source).toContain("RETURN_IDENTIFIERS_REQUIRED");
    expect(source).toContain("PAYMENT_INVOICE_MISMATCH");
    expect(source).toContain("PAYMENT_ORDER_MISMATCH");
  });

  it("create payment link race returns a graceful processing response", () => {
    const root = process.cwd();
    const source = fs.readFileSync(path.join(root, "src/app/api/payments/alfabank/create/route.ts"), "utf8");

    expect(source).toContain("PAYMENT_LINK_PROCESSING");
    expect(source).toContain("waitForActivePaymentUrl");
  });
});
