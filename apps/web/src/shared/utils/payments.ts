export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "cancelled" | "overdue";
export type PaymentStatus = "pending" | "redirected" | "authorized" | "paid" | "succeeded" | "failed" | "cancelled" | "refunded" | "unknown";

export type InvoiceForStatus = {
  amount: number | string;
  status?: InvoiceStatus | string | null;
  due_date?: string | null;
  paid_at?: string | null;
};

export type PaymentForStatus = {
  amount: number | string;
  status?: PaymentStatus | string | null;
};

const paidStatuses = new Set(["paid", "succeeded"]);
const finalPaymentStatuses = new Set(["paid", "succeeded", "refunded"]);

function toAmount(value: number | string | null | undefined) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateDiscountedInvoiceAmount(amount: number | string, percent: number | string | null | undefined) {
  const baseAmount = roundMoney(toAmount(amount));
  const rawPercent = toAmount(percent);
  const safePercent = Math.min(100, Math.max(0, rawPercent));
  const discountAmount = roundMoney(baseAmount * safePercent / 100);
  const finalAmount = roundMoney(Math.max(0, baseAmount - discountAmount));

  return {
    baseAmount,
    discountAmount,
    finalAmount,
  };
}

function isPastDate(value: string | null | undefined, today: Date) {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return date < current;
}

export function paidAmount(payments: PaymentForStatus[]) {
  return payments.reduce((sum, payment) => {
    if (!paidStatuses.has(String(payment.status || ""))) return sum;
    return sum + toAmount(payment.amount);
  }, 0);
}

export function isFinalPaymentStatus(status: PaymentStatus | string | null | undefined) {
  return finalPaymentStatuses.has(String(status || ""));
}

export function calculateInvoiceStatusFromPayments(
  invoice: InvoiceForStatus,
  payments: PaymentForStatus[],
  today = new Date(),
): InvoiceStatus {
  if (invoice.status === "cancelled") return "cancelled";

  const amount = toAmount(invoice.amount);
  const paid = paidAmount(payments);

  if (amount > 0 && paid >= amount) return "paid";
  if (paid > 0) return "partially_paid";
  if (invoice.status !== "draft" && isPastDate(invoice.due_date, today)) return "overdue";
  if (invoice.status === "draft") return "draft";
  return "issued";
}

export function markInvoicePaidWhenPaymentPaid<TInvoice extends InvoiceForStatus>(
  invoice: TInvoice,
  payments: PaymentForStatus[],
  now = new Date(),
): TInvoice & { status: InvoiceStatus; paid_at: string | null } {
  const status = calculateInvoiceStatusFromPayments(invoice, payments, now);

  return {
    ...invoice,
    status,
    paid_at: status === "paid" ? invoice.paid_at || now.toISOString() : null,
  };
}

export function guardianCanReadInvoice(
  invoice: { student_id?: string | null; guardian_id?: string | null },
  guardianLinks: Array<{ student_id?: string | null; guardian_id?: string | null }>,
) {
  return guardianLinks.some((link) => {
    const sameStudent = Boolean(invoice.student_id && link.student_id === invoice.student_id);
    const sameGuardian = Boolean(invoice.guardian_id && link.guardian_id === invoice.guardian_id);
    return sameStudent || sameGuardian;
  });
}
