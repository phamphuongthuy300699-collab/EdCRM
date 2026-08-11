import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPaymentReturnUrl } from "@/lib/payments/alfabank/return-url";
import { assertAlfaAmountMatches } from "@/lib/payments/alfabank/status-service";
import { isAllowedAlfaGatewayUrl } from "@/lib/payments/alfabank/mapper";

const root = path.resolve(__dirname, "..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const input = { requestOrigin: "https://crm.example", publicAppUrl: "https://crm.example", invoiceId: "invoice", paymentId: "payment", nodeEnv: "production" };

describe("payment boundary security", () => {
  it("rejects external return origins in production and allows relative/canonical paths", () => {
    expect(() => buildPaymentReturnUrl("https://evil.example/success", input)).toThrow();
    expect(buildPaymentReturnUrl("/payments/success", input)).toContain("https://crm.example/payments/success");
    expect(buildPaymentReturnUrl("https://crm.example/payments/success", input)).toContain("https://crm.example/payments/success");
  });

  it("uses a strict invoice-only browser payload and stored invoice amount", () => {
    const create = read("app/api/payments/alfabank/create/route.ts");
    expect(create).toContain(".strict()");
    expect(create).toContain("const amount = parseAmount(invoice.amount)");
    expect(create).not.toContain("parsed.data.amount");
  });

  it("never trusts callback status and re-queries provider before settlement", () => {
    const callback = read("app/api/payments/alfabank/callback/route.ts");
    const service = read("lib/payments/alfabank/status-service.ts");
    expect(callback).toContain("refreshAlfabankPaymentStatus");
    expect(callback).not.toContain("status: body.status");
    expect(service).toContain("getAlfaOrderStatus");
    expect(service).toContain("AMOUNT_MISMATCH");
    expect(service).toContain("settle_paid_payment");
  });

  it("treats the success page as display-only and delegates verification to the server", () => {
    const page = read("app/payments/success/page.tsx");
    expect(page).toContain("/api/payments/alfabank/return-status");
    expect(page).not.toMatch(/\.from\(["'](?:payments|invoices|billing_accounts|billing_ledger_entries)["']\)/);
    expect(page).not.toContain("settle_paid_payment");
  });

  it("emits a structured security event before rejecting an amount mismatch", () => {
    const service = read("lib/payments/alfabank/status-service.ts");
    expect(service).toContain('event: "payment_amount_mismatch"');
    expect(service.indexOf('event: "payment_amount_mismatch"')).toBeLessThan(service.indexOf('"AMOUNT_MISMATCH"'));
  });

  it("fails closed when Alfa omits or corrupts the authoritative amount", () => {
    const payment = { id: "payment", organization_id: "org", amount: 100 };
    expect(() => assertAlfaAmountMatches(undefined, payment, "callback")).toThrowError(/amount/i);
    expect(() => assertAlfaAmountMatches("not-a-number", payment, "callback")).toThrowError(/amount/i);
    expect(() => assertAlfaAmountMatches(10_000, payment, "callback")).not.toThrow();
  });

  it("does not skip provider refresh for a stored final status because refunds may follow payment", () => {
    const callback = read("app/api/payments/alfabank/callback/route.ts");
    expect(callback).not.toContain("if (isFinalPaymentStatus(payment.status))");
  });

  it("rejects SSRF gateway targets before credentials can be sent", () => {
    expect(isAllowedAlfaGatewayUrl("https://alfa.rbsuat.com/payment/rest/")).toBe(true);
    expect(isAllowedAlfaGatewayUrl("https://engine.paymentgate.ru/payment/rest/")).toBe(true);
    expect(isAllowedAlfaGatewayUrl("http://engine.paymentgate.ru/payment/rest/")).toBe(false);
    expect(isAllowedAlfaGatewayUrl("https://127.0.0.1/payment/rest/")).toBe(false);
    expect(isAllowedAlfaGatewayUrl("https://evil.example/payment/rest/")).toBe(false);
    expect(isAllowedAlfaGatewayUrl("https://engine.paymentgate.ru.evil.example/payment/rest/")).toBe(false);
  });
});
