import { describe, expect, it } from "vitest";
import {
  calculateInvoiceStatusFromPayments,
  guardianCanReadInvoice,
  markInvoicePaidWhenPaymentPaid,
  paidAmount,
} from "../shared/utils/payments";

describe("payments model rules", () => {
  it("calculates invoice status from paid payments", () => {
    expect(paidAmount([
      { amount: "1500", status: "paid" },
      { amount: 500, status: "succeeded" },
      { amount: 700, status: "failed" },
    ])).toBe(2000);

    expect(calculateInvoiceStatusFromPayments(
      { amount: 4500, status: "issued", due_date: "2026-07-10" },
      [{ amount: 2000, status: "paid" }],
      new Date("2026-07-01T12:00:00Z"),
    )).toBe("partially_paid");

    expect(calculateInvoiceStatusFromPayments(
      { amount: 4500, status: "issued", due_date: "2026-07-10" },
      [{ amount: 4500, status: "paid" }],
      new Date("2026-07-01T12:00:00Z"),
    )).toBe("paid");
  });

  it("keeps cancelled invoices and marks overdue issued invoices", () => {
    expect(calculateInvoiceStatusFromPayments(
      { amount: 4500, status: "cancelled", due_date: "2026-06-01" },
      [{ amount: 4500, status: "paid" }],
      new Date("2026-07-01T12:00:00Z"),
    )).toBe("cancelled");

    expect(calculateInvoiceStatusFromPayments(
      { amount: 4500, status: "issued", due_date: "2026-06-01" },
      [],
      new Date("2026-07-01T12:00:00Z"),
    )).toBe("overdue");
  });

  it("marks invoice paid only when paid payments cover the amount", () => {
    const invoice = markInvoicePaidWhenPaymentPaid(
      { amount: 4000, status: "issued", due_date: "2026-07-10" },
      [{ amount: 4000, status: "paid" }],
      new Date("2026-07-01T12:00:00Z"),
    );

    expect(invoice.status).toBe("paid");
    expect(invoice.paid_at).toBe("2026-07-01T12:00:00.000Z");
  });

  it("matches guardian access by linked child or explicit guardian id", () => {
    expect(guardianCanReadInvoice(
      { student_id: "student-1", guardian_id: "guardian-2" },
      [{ student_id: "student-1", guardian_id: "guardian-1" }],
    )).toBe(true);

    expect(guardianCanReadInvoice(
      { student_id: "student-2", guardian_id: "guardian-1" },
      [{ student_id: "student-1", guardian_id: "guardian-1" }],
    )).toBe(true);

    expect(guardianCanReadInvoice(
      { student_id: "student-2", guardian_id: "guardian-2" },
      [{ student_id: "student-1", guardian_id: "guardian-1" }],
    )).toBe(false);
  });
});
