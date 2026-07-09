import PayTokenClient from "./PayTokenClient";
import { verifyInvoicePaymentPublicId } from "@/lib/payments/invoice-payment-links";

export const dynamic = "force-dynamic";

function formatRub(amount: unknown) {
  const value = Number(amount);
  return Number.isFinite(value) ? value.toLocaleString("ru-RU") : "0";
}

function statusMessage(code: string) {
  switch (code) {
    case "PAY_LINK_INACTIVE":
      return "Ссылка оплаты больше не активна.";
    case "PAY_LINK_EXPIRED":
      return "Срок действия ссылки оплаты истек.";
    default:
      return "Ссылка оплаты недействительна.";
  }
}

export default async function PublicPayPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  let invoice: any = null;
  let errorMessage = "";

  try {
    const verified = await verifyInvoicePaymentPublicId(publicId);
    invoice = verified.invoice;
  } catch (error: any) {
    errorMessage = statusMessage(error?.message || "");
  }

  const isPaid = invoice?.status === "paid";
  const isCancelled = invoice?.status === "cancelled";
  const disabled = Boolean(errorMessage || isPaid || isCancelled);

  return (
    <main style={{ minHeight: "100vh", background: "#F8FAFC", display: "grid", placeItems: "center", padding: "24px" }}>
      <section style={{ width: "100%", maxWidth: "460px", background: "white", border: "1px solid #E5E7EB", borderRadius: "12px", padding: "28px", display: "grid", gap: "18px", boxShadow: "0 16px 40px rgba(15,23,42,0.08)" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#463E8E", textTransform: "uppercase" }}>Робокс</div>
          <h1 style={{ margin: "8px 0 0", fontSize: "28px", lineHeight: 1.15 }}>Оплата счета</h1>
        </div>

        {errorMessage ? (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", borderRadius: "10px", padding: "14px", fontWeight: 700 }}>
            {errorMessage}
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: "10px", fontSize: "14px" }}>
              <div>
                <div style={{ color: "#64748B", fontSize: "12px", fontWeight: 700 }}>Счет</div>
                <div style={{ fontWeight: 800 }}>{invoice.title || "Счет Робокс"}</div>
              </div>
              <div>
                <div style={{ color: "#64748B", fontSize: "12px", fontWeight: 700 }}>Сумма</div>
                <div style={{ fontWeight: 900, fontSize: "24px" }}>{formatRub(invoice.amount)} ₽</div>
              </div>
              {invoice.due_date && (
                <div>
                  <div style={{ color: "#64748B", fontSize: "12px", fontWeight: 700 }}>Срок оплаты</div>
                  <div style={{ fontWeight: 700 }}>{new Date(invoice.due_date).toLocaleDateString("ru-RU")}</div>
                </div>
              )}
            </div>

            {isPaid && (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534", borderRadius: "10px", padding: "14px", fontWeight: 800 }}>
                Счет уже оплачен.
              </div>
            )}
            {isCancelled && (
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#475569", borderRadius: "10px", padding: "14px", fontWeight: 800 }}>
                Счет отменен.
              </div>
            )}
            <PayTokenClient publicId={publicId} disabled={disabled} />
          </>
        )}
      </section>
    </main>
  );
}
