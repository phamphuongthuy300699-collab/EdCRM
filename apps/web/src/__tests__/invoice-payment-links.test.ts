import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPublicPayUrl, hashInvoicePaymentToken } from "../lib/payments/invoice-payment-links";

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("invoice payment links workflow", () => {
  it("uses public opaque ids and keeps token_hash only for compatibility", () => {
    const util = read("src/lib/payments/invoice-payment-links.ts");
    const migration = read("../../supabase/migrations/20260709000002_invoice_payment_links.sql");
    const publicIdMigration = read("../../supabase/migrations/20260709000004_invoice_payment_links_public_id.sql");

    expect(hashInvoicePaymentToken("token-a")).toHaveLength(64);
    expect(hashInvoicePaymentToken("token-a")).not.toBe("token-a");
    expect(util).toContain('`pl_${crypto.randomBytes(24).toString("base64url")}`');
    expect(migration).toContain("token_hash text not null unique");
    expect(publicIdMigration).toContain("add column if not exists public_id text");
    expect(publicIdMigration).toContain("alter column public_id set not null");
    expect(publicIdMigration).toContain("idx_invoice_payment_links_public_id");
    expect(migration).not.toContain("raw_token");
    expect(migration).not.toContain(" token text");
  });

  it("reuses existing public link and regenerates only when requested", () => {
    const util = read("src/lib/payments/invoice-payment-links.ts");

    expect(util).toContain("existing?.id && existing.public_id && !input.regenerate");
    expect(util).toContain("payUrl: buildPublicPayUrl(existing.public_id");
    expect(util).toContain("existing?.id && input.regenerate");
    expect(util).toContain(".update({ status: \"inactive\"");
  });

  it("builds public pay URL and exposes CRM publish/regenerate actions", () => {
    expect(buildPublicPayUrl("abc", "https://робокс48.рф")).toBe("https://xn--48-9kc0bsblm.xn--p1ai/pay/abc");

    const invoices = read("src/app/(crm)/crm/invoices/page.tsx");
    expect(invoices).toContain("/api/crm/invoice-payment-links");
    expect(invoices).toContain("Выставить родителю");
    expect(invoices).toContain("Перевыпустить ссылку");
    expect(invoices).toContain("regenerate");
    expect(invoices).toContain("Скопировать сообщение родителю");
    expect(invoices).toContain("payUrl");
  });

  it("rejects invalid public pay ids and blocks paid invoices before Alfa order creation", () => {
    const publicEndpoint = read("src/app/api/payments/public-link/create/route.ts");
    const payPage = read("src/app/pay/[publicId]/page.tsx");

    expect(publicEndpoint).toContain("verifyInvoicePaymentPublicId");
    expect(publicEndpoint).toContain("publicId");
    expect(publicEndpoint).toContain('["paid", "cancelled"].includes(invoice.status)');
    expect(publicEndpoint.indexOf('["paid", "cancelled"].includes(invoice.status)')).toBeLessThan(publicEndpoint.indexOf("const result = await createAlfaOrder"));
    expect(payPage).toContain("Ссылка оплаты недействительна");
    expect(payPage).toContain("Ссылка оплаты больше не активна");
    expect(payPage).toContain("Счет уже оплачен");
  });

  it("does not render personal child data on public pay page", () => {
    const payPage = read("src/app/pay/[publicId]/page.tsx");

    expect(payPage).not.toContain("full_name");
    expect(payPage).not.toContain("studentName");
    expect(payPage).not.toContain("phone");
    expect(payPage).not.toContain("email");
  });

  it("creates notification outbox without real bot integration", () => {
    const migration = read("../../supabase/migrations/20260709000003_notification_outbox.sql");
    const endpoint = read("src/app/api/crm/invoice-payment-links/route.ts");
    const helper = read("src/lib/payments/publish-invoice.ts");

    expect(migration).toContain("create table if not exists public.notification_outbox");
    expect(migration).toContain("channel text not null");
    expect(migration).toContain("status text not null default 'pending'");
    expect(endpoint).toContain("publishInvoiceForParent");
    expect(helper).toContain("notification_outbox");
    expect(helper).toContain("payUrl: link.payUrl");
    expect(helper).toContain("publicId: link.publicId");
    expect(helper).toContain("invoiceId: invoice.id");
    expect(migration).not.toContain("telegram");
    expect(migration).not.toContain("max_api");
  });
});
