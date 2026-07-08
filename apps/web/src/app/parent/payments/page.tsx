"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@robotics-crm/ui";
import { 
  CreditCard, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  CornerDownLeft, 
  Calendar,
  History,
  Percent
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { isDemoMode } from "@/shared/utils/demo";

export default function ParentPaymentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState("");
  
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [accessMessage, setAccessMessage] = useState("");
  const supabase = createSupabaseBrowserClient();

  const demoInvoices = [
    { id: "i-demo-1", title: "Абонемент на 8 занятий (LEGO Start)", amount: 4500, due_date: "2026-07-15", status: "issued", description: "Июль 2026" },
    { id: "i-demo-2", title: "Абонемент на 8 занятий (Scratch Basic)", amount: 4000, due_date: "2026-06-25", status: "paid", description: "Июнь 2026" }
  ];

  const demoPayments = [
    { id: "p-demo-1", amount: 4000, provider: "alfabank", status: "paid", created_at: "2026-06-20T14:32:00Z", paid_at: "2026-06-20T14:40:00Z", invoiceTitle: "Абонемент на 8 занятий (Scratch Basic)" }
  ];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setAccessMessage("");
        
        // Check if online payment is enabled in the backend settings
        fetch("/api/parent/payment-status")
          .then((res) => res.json())
          .then((data) => setOnlinePaymentEnabled(Boolean(data.onlinePaymentEnabled)))
          .catch(() => setOnlinePaymentEnabled(false));

        if (isDemoMode()) {
          setInvoices(demoInvoices);
          setPayments(demoPayments);
          setDiscounts([{ id: 'demo-d1', discount_type: { title: 'Многодетная семья', percent: 10, code: 'large_family', is_one_time: false }, status: 'approved' }]);
          setLoading(false);
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setInvoices([]);
          setPayments([]);
          setDiscounts([]);
          setAccessMessage("Войдите в личный кабинет, чтобы увидеть счета и платежи.");
          router.replace("/parent/login");
          setLoading(false);
          return;
        }

        // Load linked guardian
        const { data: linkData } = await supabase
          .from("guardian_users")
          .select("guardian_id")
          .eq("user_id", user.id)
          .maybeSingle() as any;

        if (!linkData) {
          setInvoices([]);
          setPayments([]);
          setDiscounts([]);
          setAccessMessage("Доступ к личному кабинету не привязан. Обратитесь к администратору школы.");
          setLoading(false);
          return;
        }

        // Get linked kids
        const { data: sgLinks } = await supabase
          .from("student_guardians")
          .select("student_id")
          .eq("guardian_id", linkData.guardian_id) as any;

        const studentIds = (sgLinks || []).map((l: any) => l.student_id).filter(Boolean);

        if (studentIds.length === 0) {
          setInvoices([]);
          setPayments([]);
          setLoading(false);
          return;
        }

        // Load all invoices
        const { data: dbInvoices } = await supabase
          .from("invoices")
          .select("*")
          .in("student_id", studentIds)
          .order("due_date", { ascending: false }) as any;

        setInvoices(dbInvoices || []);

        // Load all payments
        const { data: dbPayments } = await supabase
          .from("payments")
          .select(`
            id,
            amount,
            provider,
            status,
            created_at,
            paid_at,
            invoices (
              title
            )
          `)
          .in("student_id", studentIds)
          .order("created_at", { ascending: false }) as any;

        const formattedPayments = (dbPayments || []).map((pay: any) => ({
          id: pay.id,
          amount: parseFloat(pay.amount),
          provider: pay.provider,
          status: pay.status,
          created_at: pay.created_at,
          paid_at: pay.paid_at,
          invoiceTitle: pay.invoices?.title || "Без описания"
        }));

        setPayments(formattedPayments);

        // Load active approved discounts
        const { data: dbDiscounts } = await supabase
          .from("discount_assignments")
          .select(`
            id,
            status,
            discount_type:discount_types (
              title,
              percent,
              code,
              kind,
              is_one_time
            )
          `)
          .eq("guardian_id", linkData.guardian_id)
          .eq("status", "approved") as any;

        setDiscounts(dbDiscounts || []);
      } catch (err) {
        console.error("Error loading parent payment info:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleRequestPaymentLink = async (invoiceId: string) => {
    if (payingInvoiceId) return;

    if (invoiceId.startsWith("i-demo-")) {
      alert("Для демонстрационного счета оплата недоступна.");
      return;
    }

    try {
      setPaymentError("");
      setPayingInvoiceId(invoiceId);
      const response = await fetch("/api/payments/alfabank/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await response.json();

      if (!response.ok || !data.paymentUrl) {
        throw new Error(data.error || "Не удалось создать ссылку на оплату");
      }

      window.location.assign(data.paymentUrl);
    } catch (error: any) {
      setPaymentError(error.message || "Не удалось создать ссылку на оплату");
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <CheckCircle size={12} />
            Оплачен
          </span>
        );
      case "issued":
        return (
          <span className="badge badge-blue" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Clock size={12} />
            Выставлен
          </span>
        );
      case "overdue":
        return (
          <span className="badge badge-red" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <AlertCircle size={12} />
            Долг
          </span>
        );
      case "cancelled":
        return (
          <span className="badge badge-gray" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <XCircle size={12} />
            Отменен
          </span>
        );
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="badge badge-green">Оплачен</span>;
      case "pending":
      case "redirected":
        return <span className="badge badge-blue">В обработке</span>;
      case "failed":
        return <span className="badge badge-red">Ошибка</span>;
      case "cancelled":
        return <span className="badge badge-gray">Отменен</span>;
      case "refunded":
        return <span className="badge badge-yellow">Возвращен</span>;
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <p style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Загрузка финансовой информации...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px", margin: 0 }}>
          Оплаты и счета
        </h1>
        <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", margin: 0 }}>
          Управление абонементами, просмотр выставленных счетов и история онлайн-оплат
        </p>
      </div>

      {accessMessage && (
        <div className="card-crm" style={{ background: "white", padding: "20px", borderColor: "var(--color-warning)" }}>
          <p style={{ margin: 0, color: "var(--color-text)", fontSize: "14px", fontWeight: 700 }}>
            {accessMessage}
          </p>
        </div>
      )}

      {/* Active Discounts */}
      <div className="card-crm" style={{ background: "white", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <Percent size={20} style={{ color: "var(--color-primary)" }} />
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
            Ваши активные скидки
          </h3>
        </div>
        {discounts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--color-text-muted)", fontSize: "13px" }}>
            У вас нет активных скидок
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {discounts.map((d) => (
              <div key={d.id} style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: "1px solid var(--color-border)",
                gap: "12px"
              }}>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>
                  {d.discount_type?.title}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="badge badge-green" style={{ fontSize: "12px" }}>
                    -{d.discount_type?.percent}%
                  </span>
                  {d.discount_type?.is_one_time && (
                    <span className="badge badge-gray" style={{ fontSize: "10px" }}>
                      Разовая
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "32px",
        alignItems: "start"
      }} className="parent-grid-two-cols">
        {/* Left Column: Active Invoices */}
        <div className="card-crm" style={{ background: "white", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <CreditCard size={20} style={{ color: "var(--color-primary)" }} />
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
              Выставленные счета (Invoices)
            </h3>
          </div>

          {paymentError && (
            <div style={{ fontSize: "12px", color: "var(--color-danger)", fontWeight: 700, marginBottom: "16px" }}>
              {paymentError}
            </div>
          )}

          {invoices.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <CheckCircle size={32} style={{ color: "var(--color-success)", margin: "0 auto 12px auto", opacity: 0.8 }} />
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>
                Все счета оплачены! У вас нет активной задолженности.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {invoices.map((inv) => (
                <div key={inv.id} style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  background: "var(--color-bg)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 800 }}>{inv.title}</span>
                    {getStatusBadge(inv.status)}
                  </div>
                  
                  {inv.description && (
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>
                      {inv.description}
                    </p>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "4px" }}>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Calendar size={12} />
                      Оплатить до: {new Date(inv.due_date).toLocaleDateString("ru-RU")}
                    </span>
                    <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-text)" }}>
                      {parseFloat(inv.amount).toLocaleString()} ₽
                    </span>
                  </div>

                  {(inv.discount_percent || inv.discount_amount) && (
                    <div style={{ marginTop: "4px" }}>
                      <span style={{ fontSize: "12px", color: "var(--color-success)", fontWeight: 600 }}>
                        Скидка: {inv.discount_title} (-{inv.discount_percent}%)
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                        <span style={{ fontSize: "11px", color: "var(--color-text-muted)", textDecoration: "line-through" }}>
                          {parseFloat(inv.discount_amount ? (parseFloat(inv.amount) + parseFloat(inv.discount_amount)).toString() : inv.amount).toLocaleString()} ₽
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--color-success)", fontWeight: 700 }}>
                          -{parseFloat(inv.discount_amount || 0).toLocaleString()} ₽
                        </span>
                      </div>
                    </div>
                  )}

                  {inv.status !== "paid" && inv.status !== "cancelled" && (
                    <>
                      <Button 
                        onClick={() => handleRequestPaymentLink(inv.id)}
                        disabled={payingInvoiceId === inv.id || (!onlinePaymentEnabled && !isDemoMode())}
                        variant="primary-site" 
                        style={{ 
                          background: onlinePaymentEnabled || isDemoMode() ? "var(--color-accent)" : "var(--color-text-muted)",
                          cursor: onlinePaymentEnabled || isDemoMode() ? "pointer" : "not-allowed",
                          height: "40px", 
                          fontSize: "13px", 
                          width: "100%",
                          marginTop: "4px"
                        }}
                      >
                        {payingInvoiceId === inv.id ? "Генерация ссылки..." : onlinePaymentEnabled || isDemoMode() ? "Оплатить картой онлайн" : "Онлайн-оплата временно недоступна"}
                      </Button>
                      {!onlinePaymentEnabled && !isDemoMode() && (
                        <p style={{ fontSize: "11px", color: "var(--color-danger)", margin: "4px 0 0 0", fontWeight: 650 }}>
                          * Онлайн-оплата отключена. Пожалуйста, обратитесь к менеджеру для оплаты по реквизитам или наличными.
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Transaction History */}
        <div className="card-crm" style={{ background: "white", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <History size={20} style={{ color: "var(--color-success)" }} />
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
              История платежей (Payments History)
            </h3>
          </div>

          {payments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--color-text-muted)", fontSize: "13px" }}>
              История транзакций пуста.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "400px", overflowY: "auto", paddingRight: "4px" }}>
              {payments.map((pay) => (
                <div key={pay.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "12px",
                  gap: "16px"
                }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700 }}>
                      {pay.invoiceTitle}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                      {new Date(pay.created_at).toLocaleString("ru-RU")} ({pay.provider === "alfabank" ? "Карта" : "Касса"})
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", minWidth: "90px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 800 }}>
                      {pay.amount.toLocaleString()} ₽
                    </span>
                    {getPaymentStatusBadge(pay.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Styles for grid layout */}
      <style jsx global>{`
        @media (min-width: 900px) {
          .parent-grid-two-cols {
            grid-template-columns: 1.2fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
