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

  it("success and fail pages both call status API with payment identifiers", () => {
    const root = process.cwd();
    const successSource = fs.readFileSync(path.join(root, "src/app/payments/success/page.tsx"), "utf8");
    const failSource = fs.readFileSync(path.join(root, "src/app/payments/fail/page.tsx"), "utf8");

    for (const source of [successSource, failSource]) {
      expect(source).toContain("/api/payments/alfabank/status");
      expect(source).toContain("paymentId");
      expect(source).toContain("orderId");
      expect(source).toContain("providerOrderId");
    }
  });
});
