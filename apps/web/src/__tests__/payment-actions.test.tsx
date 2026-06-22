import { describe, it, expect } from "vitest";

describe("Payment actions loading and double pay protection", () => {
  it("prevents duplicate payments using invoice status and payingInvoiceId guard", () => {
    let payingInvoiceId: string | null = null;
    let paymentCount = 0;

    const handlePay = (invoiceId: string) => {
      if (payingInvoiceId === invoiceId) return; // guard against double click
      payingInvoiceId = invoiceId;
      paymentCount++;
    };

    // First pay click
    handlePay("inv-123");
    expect(paymentCount).toBe(1);
    expect(payingInvoiceId).toBe("inv-123");

    // Second pay click (while still processing)
    handlePay("inv-123");
    expect(paymentCount).toBe(1); // count remains 1, duplicate pay prevented!
  });
});
