import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPublicPayUrl, hashInvoicePaymentToken } from "../lib/payments/invoice-payment-links";

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("invoice payment links workflow", () => {
  it("hashes tokens and never models raw token storage", () => {
    const util = read("src/lib/payments/invoice-payment-links.ts");
    const migration = read("../../supabase/migrations/20260709000002_invoice_payment_links.sql");

    expect(hashInvoicePaymentToken("token-a")).toHaveLength(64);
    expect(hashInvoicePaymentToken("token-a")).not.toBe("token-a");
    expect(util).toContain("crypto.randomBytes(32)");
    expect(migration).toContain("token_hash text not null unique");
    expect(migration).not.toContain("raw_token");
    expect(migration).not.toContain(" token text");
  });

  it("builds public pay URL and exposes CRM publish action", () => {
    expect(buildPublicPayUrl("abc", "https://робокс48.рф")).toBe("https://xn--48-9kc0bsblm.xn--p1ai/pay/abc");

    const invoices = read("src/app/(crm)/crm/invoices/page.tsx");
    expect(invoices).toContain("/api/crm/invoice-payment-links");
    expect(invoices).toContain("Выставить родителю");
    expect(invoices).toContain("Скопировать сообщение родителю");
    expect(invoices).toContain("payUrl");
  });

  it("rejects invalid public pay tokens and blocks paid invoices before Alfa order creation", () => {
    const publicEndpoint = read("src/app/api/payments/public-link/create/route.ts");
    const payPage = read("src/app/pay/[token]/page.tsx");

    expect(publicEndpoint).toContain("verifyInvoicePaymentToken");
    expect(publicEndpoint).toContain('["paid", "cancelled"].includes(invoice.status)');
    expect(publicEndpoint.indexOf('["paid", "cancelled"].includes(invoice.status)')).toBeLessThan(publicEndpoint.indexOf("const result = await createAlfaOrder"));
    expect(payPage).toContain("Ссылка оплаты недействительна");
    expect(payPage).toContain("Счет уже оплачен");
  });

  it("does not render personal child data on public pay page", () => {
    const payPage = read("src/app/pay/[token]/page.tsx");

    expect(payPage).not.toContain("full_name");
    expect(payPage).not.toContain("studentName");
    expect(payPage).not.toContain("phone");
    expect(payPage).not.toContain("email");
  });

  it("creates notification outbox without real bot integration", () => {
    const migration = read("../../supabase/migrations/20260709000003_notification_outbox.sql");

    expect(migration).toContain("create table if not exists public.notification_outbox");
    expect(migration).toContain("channel text not null");
    expect(migration).toContain("status text not null default 'pending'");
    expect(migration).not.toContain("telegram");
    expect(migration).not.toContain("max_api");
  });
});
