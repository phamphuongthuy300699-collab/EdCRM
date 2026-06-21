"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { CreditCard, Plus, Search, CheckCircle, Clock, AlertCircle, Sparkles } from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";

export default function CrmPaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "paid" | "issued" | "overdue">("all");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [newStudentId, setNewStudentId] = useState("");
  const [newTitle, setNewTitle] = useState("Абонемент на 8 занятий");
  const [newAmount, setNewAmount] = useState("4500");
  const [newDueDate, setNewDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

  const [students, setStudents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const supabase = createSupabaseBrowserClient();

  const initialInvoices = [
    { id: "i1", studentName: "Игорь Петров", parentName: "Анна Петрова", groupName: "LEGO Start 1", amount: 4500, dueDate: "25.06.2026", status: "paid", title: "Абонемент на Июнь" },
    { id: "i2", studentName: "Данил Соловьев", parentName: "Михаил С.", groupName: "LEGO Start 1", amount: 4500, dueDate: "25.06.2026", status: "paid", title: "Абонемент на Июнь" },
    { id: "i3", studentName: "Алиса Волкова", parentName: "Сергей Волков", groupName: "Scratch Basic", amount: 4000, dueDate: "28.06.2026", status: "issued", title: "Абонемент на Июнь" },
    { id: "i4", studentName: "Кирилл Семенов", parentName: "Ольга Семенова", groupName: "LEGO Start 2", amount: 4500, dueDate: "15.06.2026", status: "overdue", title: "Абонемент на Июнь" },
    { id: "i5", studentName: "Даша Смирнова", parentName: "Елена Смирнова", groupName: "Scratch Basic", amount: 4000, dueDate: "25.06.2026", status: "paid", title: "Абонемент на Июнь" }
  ];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Fetch students for dropdown selection
        const { data: studentsData } = await supabase
          .from("students")
          .select("id, full_name");
        if (studentsData) setStudents(studentsData);

        // Fetch invoices
        const { data: invoicesData, error } = await supabase
          .from("invoices")
          .select(`
            id,
            title,
            amount,
            status,
            due_date,
            students (full_name, id)
          `)
          .order("due_date", { ascending: false });

        if (error) throw error;

        if (invoicesData && invoicesData.length > 0) {
          const formatted = invoicesData.map((inv: any) => ({
            id: inv.id,
            studentName: inv.students?.full_name || "Неизвестно",
            parentName: "Родитель", // Simple placeholder or query guardians
            groupName: "Курс школы",
            amount: parseFloat(inv.amount),
            dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString("ru-RU") : "Не установлен",
            status: inv.status,
            title: inv.title
          }));

          setInvoices([...formatted, ...initialInvoices]);
        } else {
          setInvoices(initialInvoices);
        }
      } catch (err) {
        console.error("Error loading payments:", err);
        setInvoices(initialInvoices);
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
            Оплачено
          </span>
        );
      case "issued":
      case "draft":
        return (
          <span className="badge badge-blue" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Clock size={12} />
            Ожидает
          </span>
        );
      case "overdue":
        return (
          <span className="badge badge-red" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <AlertCircle size={12} />
            Просрочен
          </span>
        );
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  };

  const handleMarkAsPaid = async (id: any) => {
    try {
      if (typeof id === "string") {
        const { error } = await (supabase.from("invoices") as any)
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", id);
        
        if (error) throw error;
      }

      setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: "paid" } : inv));
      alert("Счет успешно отмечен как оплаченный!");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось изменить статус оплаты: " + err.message);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orgRes = await (supabase.from("organizations") as any).select("id").eq("slug", "robotics-lipetsk").single();
      if (!orgRes.data) throw new Error("Org not found");

      // Find student name for local update
      const selStudent = students.find(s => s.id === newStudentId);

      const insertData = {
        organization_id: orgRes.data.id,
        student_id: newStudentId,
        title: newTitle,
        amount: parseFloat(newAmount),
        currency: "RUB",
        status: "issued" as const,
        due_date: newDueDate,
        issued_at: new Date().toISOString()
      };

      const { data, error } = await (supabase.from("invoices") as any).insert(insertData).select().single();
      if (error) throw error;

      const newInvObj = {
        id: data.id,
        studentName: selStudent?.full_name || "Неизвестно",
        parentName: "Родитель",
        groupName: "Робототехника",
        amount: data.amount,
        dueDate: new Date(data.due_date).toLocaleDateString("ru-RU"),
        status: data.status,
        title: data.title
      };

      setInvoices([newInvObj, ...invoices]);
      setShowAddModal(false);
      
      // Reset form
      setNewStudentId("");
      setNewTitle("Абонемент на 8 занятий");
      setNewAmount("4500");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось создать счет: " + err.message);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesTab = activeTab === "all" || inv.status === activeTab;
    const matchesSearch = 
      inv.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      inv.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
            Счета и Оплаты
          </h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
            Общая сумма выставленных счетов: {invoices.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} ₽
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} variant="primary-crm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Plus size={16} />
          <span>Выставить счет</span>
        </Button>
      </div>

      {/* Tabs & Search */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--color-border)",
        paddingBottom: "12px",
        gap: "24px"
      }}>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
          {[
            { id: "all", label: "Все счета" },
            { id: "paid", label: "Оплаченные" },
            { id: "issued", label: "Ожидают" },
            { id: "overdue", label: "Просроченные" }
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
                transition: "all 0.2s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", width: "240px" }}>
          <Search size={16} style={{
            position: "absolute",
            left: "12px",
            top: "12px",
            color: "var(--color-text-muted)"
          }} />
          <input 
            type="text" 
            className="form-input" 
            style={{ height: "40px", borderRadius: "8px", paddingLeft: "36px", fontSize: "var(--font-small)" }}
            placeholder="Поиск по ученику, родителю..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="card-crm" style={{ padding: 0, overflow: "hidden", background: "white" }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: "var(--font-small)"
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
              <th>Срок оплаты</th>
              <th>Статус</th>
              <th style={{ padding: "0 24px", textAlign: "right" }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv) => (
              <tr key={inv.id} style={{
                borderBottom: "1px solid var(--color-border)",
                height: "64px",
                transition: "background 0.2s"
              }} className="table-row">
                <td style={{ padding: "0 24px" }}>
                  <div style={{ fontWeight: 700 }}>{inv.studentName}</div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{inv.title}</div>
                </td>
                <td>{inv.parentName}</td>
                <td style={{ fontWeight: 700 }}>{inv.amount.toLocaleString()} ₽</td>
                <td>{inv.dueDate}</td>
                <td>{getStatusBadge(inv.status)}</td>
                <td style={{ padding: "0 24px", textAlign: "right" }}>
                  {inv.status !== "paid" ? (
                    <button 
                      onClick={() => handleMarkAsPaid(inv.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "none",
                        background: "var(--color-success-soft)",
                        color: "var(--color-success)",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      Отметить оплаченным
                    </button>
                  ) : (
                    <span style={{ color: "var(--color-text-muted)", fontSize: "12px", fontWeight: 600 }}>Проведено</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Invoice Modal */}
      {showAddModal && (
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
            maxWidth: "440px",
            padding: "32px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "24px"
          }}>
            <div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "4px" }}>Выписать счет</h3>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Создание нового платежного требования</p>
            </div>

            <form onSubmit={handleCreateInvoice} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ученик *</label>
                <select 
                  className="form-input" 
                  required 
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                >
                  <option value="">Выберите ученика</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Назначение платежа *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Сумма (₽) *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    required 
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Срок оплаты *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    required 
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <Button 
                  type="button" 
                  variant="secondary-site" 
                  style={{ flex: 1 }}
                  onClick={() => setShowAddModal(false)}
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  variant="primary-crm" 
                  style={{ flex: 1 }}
                >
                  Создать
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
