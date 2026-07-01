"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  Receipt, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Eye, 
  CornerDownLeft, 
  ChevronRight 
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { isDemoMode } from "@/shared/utils/demo";

export default function CrmPaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "pending" | "redirected" | "failed" | "refunded">("all");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  
  // Inspector Modal State
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);

  const supabase = createSupabaseBrowserClient();

  const initialPayments = [
    {
      id: "p1",
      studentName: "Игорь Петров",
      parentName: "Анна Петрова",
      amount: 4500,
      provider: "alfabank",
      status: "paid",
      createdAt: "20.06.2026 15:32",
      paidAt: "20.06.2026 15:40",
      invoiceTitle: "Абонемент на Июнь (LEGO Start 1)",
      rawRequest: { invoiceId: "i1", requestedBy: "u1", mode: "test" },
      rawResponse: { orderStatus: 2, amount: 450000, actionCode: 0, actionCodeDescription: "Success" }
    },
    {
      id: "p2",
      studentName: "Данил Соловьев",
      parentName: "Михаил С.",
      amount: 4500,
      provider: "manual",
      status: "paid",
      createdAt: "22.06.2026 11:15",
      paidAt: "22.06.2026 11:15",
      invoiceTitle: "Абонемент на Июнь (LEGO Start 1)",
      rawRequest: { manualPay: true },
      rawResponse: { type: "cash" }
    },
    {
      id: "p3",
      studentName: "Кирилл Семенов",
      parentName: "Ольга Семенова",
      amount: 4500,
      provider: "alfabank",
      status: "failed",
      createdAt: "15.06.2026 18:22",
      paidAt: "-",
      invoiceTitle: "Абонемент на Июнь (LEGO Start 2)",
      rawRequest: { invoiceId: "i4", requestedBy: "u1", mode: "test" },
      rawResponse: { orderStatus: 6, errorCode: "1", errorMessage: "Declined by issuer" }
    }
  ];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Fetch user and role
        if (isDemoMode()) {
          setUserRole("admin");
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: membership } = await supabase
              .from("org_memberships")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("is_active", true)
              .maybeSingle() as any;
            if (membership) {
              setUserRole(membership.role);
            }
          }
        }

        // Fetch payments registry
        const { data: paymentsData, error } = await supabase
          .from("payments")
          .select(`
            id,
            amount,
            provider,
            status,
            created_at,
            paid_at,
            raw_request,
            raw_response,
            invoices (
              id,
              number,
              title
            ),
            students (
              id,
              full_name,
              student_guardians (
                guardians (
                  full_name
                )
              )
            )
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (isDemoMode()) {
          setPayments(initialPayments);
        } else {
          if (paymentsData && paymentsData.length > 0) {
            const formatted = paymentsData.map((pay: any) => {
              const firstGuardian = pay.students?.student_guardians?.[0]?.guardians;
              return {
                id: pay.id,
                studentName: pay.students?.full_name || "Неизвестно",
                parentName: firstGuardian?.full_name || "Не указан",
                amount: parseFloat(pay.amount),
                provider: pay.provider,
                status: pay.status,
                createdAt: pay.created_at ? new Date(pay.created_at).toLocaleString("ru-RU") : "-",
                paidAt: pay.paid_at ? new Date(pay.paid_at).toLocaleString("ru-RU") : "-",
                invoiceTitle: pay.invoices?.title || pay.invoices?.number || "Без счета",
                rawRequest: pay.raw_request,
                rawResponse: pay.raw_response
              };
            });
            setPayments(formatted);
          } else {
            setPayments([]);
          }
        }
      } catch (err) {
        console.error("Error loading payments registry:", err);
        if (isDemoMode()) {
          setPayments(initialPayments);
        } else {
          setPayments([]);
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <CheckCircle size={12} />
            Оплачен
          </span>
        );
      case "pending":
        return (
          <span className="badge badge-gray" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Clock size={12} />
            Создан
          </span>
        );
      case "redirected":
        return (
          <span className="badge badge-blue" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <ChevronRight size={12} />
            Перенаправлен
          </span>
        );
      case "failed":
        return (
          <span className="badge badge-red" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <AlertCircle size={12} />
            Ошибка
          </span>
        );
      case "cancelled":
        return (
          <span className="badge badge-gray" style={{ display: "inline-flex", alignItems: "center", gap: "4px", opacity: 0.6 }}>
            <XCircle size={12} />
            Отменен
          </span>
        );
      case "refunded":
        return (
          <span className="badge badge-yellow" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <CornerDownLeft size={12} />
            Возвращен
          </span>
        );
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  };

  // Helper to redact confidential keys (e.g. passwords, tokens) before showing to admins
  const redactSecrets = (obj: any): any => {
    if (!obj || typeof obj !== "object") return obj;
    const copy = JSON.parse(JSON.stringify(obj));
    const secrets = ["password", "token", "secret", "api_password_secret", "apiPassword"];
    
    const recurse = (current: any) => {
      for (const key in current) {
        if (secrets.some(s => key.toLowerCase().includes(s))) {
          current[key] = "[redacted]";
        } else if (typeof current[key] === "object" && current[key] !== null) {
          recurse(current[key]);
        }
      }
    };
    
    recurse(copy);
    return copy;
  };

  // Guard access for teacher
  if (userRole === "teacher") {
    return (
      <div style={{ display: "grid", gap: "16px", maxWidth: "720px" }}>
        <h1 style={{ margin: 0, fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)" }}>
          Реестр платежей
        </h1>
        <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, background: "#fff", padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Доступ ограничен</h2>
          <p style={{ color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            Реестр транзакций доступен только владельцу, администратору и бухгалтерскому составу.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <p style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Загрузка платежей...</p>
      </div>
    );
  }

  const filteredPayments = payments.filter(pay => {
    const matchesTab = activeTab === "all" || pay.status === activeTab;
    const matchesSearch = 
      pay.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      pay.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pay.invoiceTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const isOwnerOrAdmin = ["owner", "admin"].includes(userRole || "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px", margin: 0 }}>
          Платежи (Payments Registry)
        </h1>
        <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", margin: 0 }}>
          Сводный реестр всех транзакций в системе
        </p>
      </div>

      {/* Tabs & Search */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--color-border)",
        paddingBottom: "12px",
        flexWrap: "wrap",
        gap: "24px"
      }}>
        <div style={{ display: "flex", gap: "4px", overflowX: "auto", paddingBottom: "4px" }}>
          {[
            { id: "all", label: "Все транзакции" },
            { id: "paid", label: "Оплаченные" },
            { id: "pending", label: "Созданные" },
            { id: "redirected", label: "Ожидают" },
            { id: "failed", label: "Ошибки" },
            { id: "refunded", label: "Возвраты" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "var(--font-small)",
                fontWeight: activeTab === tab.id ? 700 : 500,
                border: "none",
                cursor: "pointer",
                background: activeTab === tab.id ? "var(--color-primary-soft)" : "transparent",
                color: activeTab === tab.id ? "var(--color-primary-dark)" : "var(--color-text-muted)",
                transition: "all 0.2s",
                whiteSpace: "nowrap"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", width: "260px" }}>
          <Search size={16} style={{
            position: "absolute",
            left: "12px",
            top: "12px",
            color: "var(--color-text-muted)"
          }} />
          <input 
            type="text" 
            className="form-input" 
            style={{ height: "40px", borderRadius: "8px", paddingLeft: "36px", fontSize: "var(--font-small)", marginBottom: 0 }}
            placeholder="Поиск по ученику, родителю..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table container */}
      <div className="card-crm" style={{ padding: 0, overflowX: "auto", background: "white" }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: "var(--font-small)",
          minWidth: "900px"
        }}>
          <thead>
            <tr style={{
              background: "var(--color-bg)",
              borderBottom: "1px solid var(--color-border)",
              fontWeight: 700,
              color: "var(--color-text)",
              height: "48px"
            }}>
              <th style={{ padding: "0 24px" }}>Ученик / Назначение</th>
              <th>Родитель</th>
              <th>Сумма</th>
              <th>Провайдер</th>
              <th>Статус</th>
              <th>Создан / Оплачен</th>
              {isOwnerOrAdmin && <th style={{ padding: "0 24px", textAlign: "right" }}>Логи</th>}
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={isOwnerOrAdmin ? 7 : 6} style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-muted)" }}>
                  Транзакции не найдены.
                </td>
              </tr>
            ) : (
              filteredPayments.map((pay) => (
                <tr key={pay.id} style={{
                  borderBottom: "1px solid var(--color-border)",
                  height: "64px",
                  transition: "background 0.2s"
                }} className="table-row">
                  <td style={{ padding: "0 24px" }}>
                    <div style={{ fontWeight: 700 }}>{pay.studentName}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{pay.invoiceTitle}</div>
                  </td>
                  <td>{pay.parentName}</td>
                  <td style={{ fontWeight: 700 }}>{pay.amount.toLocaleString()} ₽</td>
                  <td>
                    <span className="badge badge-gray">
                      {pay.provider === "alfabank" ? "Альфа-Банк эквайринг" : "Ручное проведение"}
                    </span>
                  </td>
                  <td>{getStatusBadge(pay.status)}</td>
                  <td>
                    <div style={{ fontSize: "12px", fontWeight: 500 }}>{pay.createdAt}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      {pay.status === "paid" ? `Оплачен: ${pay.paidAt}` : "Не оплачен"}
                    </div>
                  </td>
                  {isOwnerOrAdmin && (
                    <td style={{ padding: "0 24px", textAlign: "right" }}>
                      <button
                        onClick={() => setSelectedPayment(pay)}
                        title="Посмотреть логи шлюза"
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid var(--color-border)",
                          background: "white",
                          color: "var(--color-text-muted)",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11px",
                          fontWeight: 600
                        }}
                      >
                        <Eye size={12} />
                        <span>Инспектор</span>
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Raw Event Inspector Modal */}
      {selectedPayment && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.4)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            borderRadius: "var(--radius-card-site)",
            border: "1px solid var(--color-border)",
            width: "100%",
            maxWidth: "600px",
            padding: "32px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxHeight: "85vh"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "4px" }}>
                  Инспектор транзакции {selectedPayment.id.slice(0, 8)}...
                </h3>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>
                  Сырые логи запросов и ответов банка (конфиденциальные данные вырезаны)
                </p>
              </div>
              <button 
                onClick={() => setSelectedPayment(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", fontWeight: 600, color: "var(--color-text-muted)" }}
              >
                &times;
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", flex: 1, paddingRight: "8px" }}>
              <div>
                <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px", color: "var(--color-primary-dark)" }}>
                  Запрос к шлюзу (Request)
                </h4>
                <pre style={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  overflowX: "auto",
                  margin: 0
                }}>
                  {JSON.stringify(redactSecrets(selectedPayment.rawRequest), null, 2)}
                </pre>
              </div>

              <div>
                <h4 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px", color: "var(--color-success)" }}>
                  Ответ от шлюза (Response)
                </h4>
                <pre style={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  padding: "12px",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  overflowX: "auto",
                  margin: 0
                }}>
                  {JSON.stringify(redactSecrets(selectedPayment.rawResponse), null, 2)}
                </pre>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button 
                type="button" 
                variant="secondary-site" 
                onClick={() => setSelectedPayment(null)}
                style={{ width: "120px" }}
              >
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
