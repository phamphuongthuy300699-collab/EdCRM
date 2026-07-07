"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  CreditCard, 
  Plus, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Copy, 
  RefreshCw, 
  FileText,
  Percent 
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { isDemoMode } from "@/shared/utils/demo";
import { calculateDiscountedInvoiceAmount, shouldReuseAlfabankPaymentUrl } from "@/shared/utils/payments";
import { useActionConfirmation } from "@/shared/ui/useActionConfirmation";

export default function CrmInvoicesPage() {
  const { askAction, modal: actionModal } = useActionConfirmation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "issued" | "paid" | "cancelled" | "overdue">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Form State
  const [newStudentId, setNewStudentId] = useState("");
  const [newTitle, setNewTitle] = useState("Абонемент на 8 занятий");
  const [newAmount, setNewAmount] = useState("4500");
  const [newDueDate, setNewDueDate] = useState(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [discountInfo, setDiscountInfo] = useState<{ title: string; percent: number; discount_type_id: string; discount_assignment_id: string } | null>(null);
  const [loadingDiscount, setLoadingDiscount] = useState(false);

  const [students, setStudents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [onlinePayingInvoiceId, setOnlinePayingInvoiceId] = useState<string | null>(null);
  const [onlinePaymentError, setOnlinePaymentError] = useState("");
  const processingMap = useRef<Record<string, boolean>>({});
  const supabase = createSupabaseBrowserClient();

  // Auto-detect discount for selected student
  useEffect(() => {
    if (!newStudentId) {
      setDiscountInfo(null);
      return;
    }
    let cancelled = false;
    async function fetchDiscount() {
      setLoadingDiscount(true);
      try {
        // 1. Get guardian for the student
        const { data: sgRows } = await (supabase.from("student_guardians") as any)
          .select("guardian_id")
          .eq("student_id", newStudentId);
        if (!sgRows || sgRows.length === 0) {
          if (!cancelled) setDiscountInfo(null);
          return;
        }
        const guardianIds = sgRows.map((r: any) => r.guardian_id);

        // 2. Fetch approved active discount assignments for guardians
        const { data: assignments } = await (supabase.from("discount_assignments") as any)
          .select("id, discount_type_id, discount_types!inner ( title, percent, is_active )")
          .in("guardian_id", guardianIds)
          .eq("status", "approved")
          .eq("discount_types.is_active", true);

        if (cancelled) return;
        if (!assignments || assignments.length === 0) {
          setDiscountInfo(null);
          return;
        }

        // 3. Pick the best (highest percent) discount
        let best: any = null;
        for (const a of assignments) {
          const pct = a.discount_types?.percent ?? 0;
          if (!best || pct > best._pct) {
            best = { ...a, _pct: pct };
          }
        }
        if (best) {
          setDiscountInfo({
            title: best.discount_types?.title || "Скидка",
            percent: best._pct,
            discount_type_id: best.discount_type_id,
            discount_assignment_id: best.id
          });
        } else {
          setDiscountInfo(null);
        }
      } catch (err) {
        console.error("Error fetching discount:", err);
        if (!cancelled) setDiscountInfo(null);
      } finally {
        if (!cancelled) setLoadingDiscount(false);
      }
    }
    fetchDiscount();
    return () => { cancelled = true; };
  }, [newStudentId]);

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

        // Fetch current user and role
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
            enrollments (
              groups (
                title
              )
            ),
            students (
              id,
              full_name,
              enrollments (
                groups (
                  title
                )
              ),
              student_guardians (
                guardians (
                  full_name
                )
              )
            )
          `)
          .order("due_date", { ascending: false });

        if (error) throw error;

        if (isDemoMode()) {
          setInvoices(initialInvoices);
        } else {
          if (invoicesData && invoicesData.length > 0) {
            const formatted = invoicesData.map((inv: any) => {
              const firstGuardian = inv.students?.student_guardians?.[0]?.guardians;
              const activeEnroll = inv.students?.enrollments?.find((e: any) => e.groups) || null;
              const groupTitle = inv.enrollments?.groups?.title || activeEnroll?.groups?.title || "Без группы";
              return {
                id: inv.id,
                studentName: inv.students?.full_name || "Неизвестно",
                parentName: firstGuardian?.full_name || "Не указан",
                groupName: groupTitle,
                amount: parseFloat(inv.amount),
                dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString("ru-RU") : "Не установлен",
                status: inv.status,
                title: inv.title
              };
            });
            setInvoices(formatted);
          } else {
            setInvoices([]);
          }
        }
      } catch (err) {
        console.error("Error loading invoices:", err);
        if (isDemoMode()) {
          setInvoices(initialInvoices);
        } else {
          setInvoices([]);
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
      case "issued":
        return (
          <span className="badge badge-blue" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Clock size={12} />
            Выставлен
          </span>
        );
      case "draft":
        return (
          <span className="badge badge-gray" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <FileText size={12} />
            Черновик
          </span>
        );
      case "cancelled":
        return (
          <span className="badge badge-gray" style={{ display: "inline-flex", alignItems: "center", gap: "4px", opacity: 0.6 }}>
            <XCircle size={12} />
            Отменен
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

  const handleMarkAsPaid = async (id: string) => {
    if (processingMap.current[id]) return;
    processingMap.current[id] = true;
    try {
      setPayingInvoiceId(id);

      const demo = isDemoMode();
      const isMockId = id.startsWith("i-mock-") || id === "i1" || id === "i2" || id === "i3" || id === "i4" || id === "i5";

      if (demo || isMockId) {
        setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: "paid" } : inv));
        alert("Счет отмечен оплаченным вручную! (Демо)");
        return;
      }

      // Fetch invoice details
      const { data: inv, error: fetchErr } = await supabase
        .from("invoices")
        .select("student_id, amount, organization_id")
        .eq("id", id)
        .single() as any;

      if (fetchErr || !inv) {
        throw new Error("Счет не найден в базе данных");
      }

      // Create manual payment
      const { error: paymentErr } = await (supabase
        .from("payments") as any)
        .insert({
          organization_id: inv.organization_id,
          student_id: inv.student_id,
          invoice_id: id,
          amount: parseFloat(inv.amount),
          provider: "manual",
          status: "paid",
          paid_at: new Date().toISOString()
        }) as any;

      if (paymentErr) throw paymentErr;

      // Update invoice status
      const { error } = await (supabase
        .from("invoices") as any)
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;

      setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: "paid" } : inv));
      alert("Счет успешно оплачен вручную!");
    } catch (err: any) {
      console.error(err);
      alert("Ошибка: " + err.message);
    } finally {
      setPayingInvoiceId(null);
      processingMap.current[id] = false;
    }
  };

  const handleCancelInvoice = async (id: string) => {
    const allowed = await askAction({
      title: "Отменить счет",
      description: "Счет будет помечен как отмененный. Оплаченные платежи и события не удаляются.",
      dangerLevel: "warning",
      confirmText: "Отменить счет",
    });
    if (!allowed) return;
    try {
      if (isDemoMode() || id.startsWith("i-mock-") || id.length < 10) {
        setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: "cancelled" } : inv));
        alert("Счет успешно отменен (Демо)");
        return;
      }
      const { error } = await (supabase
        .from("invoices") as any)
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;
      setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status: "cancelled" } : inv));
      alert("Счет отменен.");
    } catch (err: any) {
      alert("Ошибка отмены счета: " + err.message);
    }
  };

  const handleCopyPaymentLink = async (invoiceId: string) => {
    try {
      if (isDemoMode() || invoiceId.startsWith("i-mock-") || invoiceId.length < 10) {
        const demoLink = `${window.location.origin}/payment?invoiceId=${invoiceId}`;
        await navigator.clipboard.writeText(demoLink);
        alert("Демо-ссылка скопирована: " + demoLink);
        return;
      }

      setOnlinePayingInvoiceId(invoiceId);

      const { data: existing } = await (supabase
        .from("payments") as any)
        .select("payment_url, status, created_at")
        .eq("invoice_id", invoiceId)
        .eq("provider", "alfabank")
        .not("payment_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (shouldReuseAlfabankPaymentUrl(existing)) {
        await navigator.clipboard.writeText(existing.payment_url);
        alert("Ссылка на оплату скопирована в буфер обмена!");
        return;
      }

      const response = await fetch("/api/payments/alfabank/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await response.json();

      if (!response.ok || !data.paymentUrl) {
        throw new Error(data.error || "Не удалось создать ссылку");
      }

      await navigator.clipboard.writeText(data.paymentUrl);
      alert("Новая ссылка на оплату сгенерирована и скопирована в буфер обмена!");
    } catch (error: any) {
      alert("Ошибка повтора ссылки: " + error.message);
    } finally {
      setOnlinePayingInvoiceId(null);
    }
  };

  const handleCheckPaymentStatus = async (invoiceId: string) => {
    try {
      if (isDemoMode() || invoiceId.startsWith("i-mock-") || invoiceId.length < 10) {
        alert("Ручная проверка статуса в Демо-режиме недоступна.");
        return;
      }

      setPayingInvoiceId(invoiceId);

      const response = await fetch("/api/payments/alfabank/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Проверка статуса не удалась");
      }

      alert(`Запрос обработан. Статус платежа: ${data.status}`);
      window.location.reload();
    } catch (error: any) {
      alert("Ошибка проверки: " + error.message);
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selStudent = students.find(s => s.id === newStudentId);

      if (isDemoMode()) {
        const newInvObj = {
          id: "i-mock-" + Date.now(),
          studentName: selStudent?.full_name || "Неизвестно",
          parentName: "Родитель (Демо)",
          groupName: "Робототехника",
          amount: parseFloat(newAmount),
          dueDate: new Date(newDueDate).toLocaleDateString("ru-RU"),
          status: "issued",
          title: newTitle
        };
        setInvoices([newInvObj, ...invoices]);
        setShowAddModal(false);
        setNewStudentId("");
        setNewTitle("Абонемент на 8 занятий");
        setNewAmount("4500");
        alert("Счет выставлен (Демо-режим)!");
        return;
      }

      const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
      if (!orgRes.data) throw new Error("Организация не найдена");

      // Fetch primary guardian and active enrollment
      const { data: studentInfo } = await supabase
        .from("students")
        .select(`
          enrollments (
            id,
            status,
            groups (
              title
            )
          ),
          student_guardians (
            guardian_id,
            is_primary,
            guardians (
              full_name
            )
          )
        `)
        .eq("id", newStudentId)
        .single() as any;

      const activeEnrollment = studentInfo?.enrollments?.find((e: any) => e.status === "active");
      const primaryGuardianLink = studentInfo?.student_guardians?.find((sg: any) => sg.is_primary) || studentInfo?.student_guardians?.[0];
      
      const parentName = primaryGuardianLink?.guardians?.full_name || "Не указан";
      const groupTitle = activeEnrollment?.groups?.title || "Без группы";

      const invoiceAmounts = calculateDiscountedInvoiceAmount(newAmount, discountInfo?.percent || 0);
      if (invoiceAmounts.baseAmount <= 0) {
        throw new Error("Сумма счёта должна быть больше 0");
      }

      const insertData: any = {
        organization_id: orgRes.data.id,
        student_id: newStudentId,
        guardian_id: primaryGuardianLink?.guardian_id || null,
        enrollment_id: activeEnrollment?.id || null,
        title: newTitle,
        description: newTitle,
        amount: invoiceAmounts.finalAmount,
        currency: "RUB",
        status: "issued" as const,
        due_date: newDueDate,
        issued_at: new Date().toISOString()
      };

      if (discountInfo) {
        insertData.discount_amount = invoiceAmounts.discountAmount;
        insertData.discount_title = discountInfo.title;
        insertData.discount_percent = discountInfo.percent;
      }

      const { data, error } = await (supabase.from("invoices") as any).insert(insertData).select().single();
      if (error) throw error;

      // Insert discount record if applicable
      if (discountInfo && data?.id) {
        const { error: discountInsertError } = await (supabase.from("invoice_discounts") as any).insert({
          organization_id: orgRes.data.id,
          invoice_id: data.id,
          discount_assignment_id: (discountInfo as any).discount_assignment_id || null,
          title: discountInfo.title,
          percent: discountInfo.percent,
          amount: invoiceAmounts.discountAmount
        });
        if (discountInsertError) throw discountInsertError;
      }

      const newInvObj = {
        id: data.id,
        studentName: selStudent?.full_name || "Неизвестно",
        parentName: parentName,
        groupName: groupTitle,
        amount: data.amount,
        dueDate: new Date(data.due_date).toLocaleDateString("ru-RU"),
        status: data.status,
        title: data.title
      };

      setInvoices([newInvObj, ...invoices]);
      setShowAddModal(false);
      setNewStudentId("");
      setNewTitle("Абонемент на 8 занятий");
      setNewAmount("4500");
      alert("Счет успешно выставлен!");
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

    let dateVal: Date | null = null;
    if (inv.dueDate) {
      if (inv.dueDate.includes(".")) {
        const [d, m, y] = inv.dueDate.split(".");
        dateVal = new Date(`${y}-${m}-${d}`);
      } else {
        dateVal = new Date(inv.dueDate);
      }
    }

    const matchesStartDate = !startDate || (dateVal && dateVal >= new Date(startDate));
    const matchesEndDate = !endDate || (dateVal && dateVal <= new Date(endDate));

    return matchesTab && matchesSearch && matchesStartDate && matchesEndDate;
  });

  // Guard access for teacher role
  if (userRole === "teacher") {
    return (
      <div style={{ display: "grid", gap: "16px", maxWidth: "720px" }}>
        <h1 style={{ margin: 0, fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)" }}>
          Счета и Оплаты
        </h1>
        <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, background: "#fff", padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Доступ ограничен</h2>
          <p style={{ color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            Раздел счетов и финансовых операций доступен только руководству и администраторам организации.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <p style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Загрузка счетов...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px", margin: 0 }}>
            Счета (Invoices)
          </h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", margin: 0 }}>
            Общая сумма счетов: {invoices.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} ₽
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} variant="primary-crm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Plus size={16} />
          <span>Выставить счет</span>
        </Button>
      </div>

      {/* Date & Period Filters */}
      <div className="card-crm" style={{ background: "white", padding: "16px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text)" }}>Период сдачи:</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>С</label>
          <input 
            type="date" 
            className="form-input" 
            style={{ width: "140px", height: "36px", padding: "0 8px", fontSize: "12px", marginBottom: 0 }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>По</label>
          <input 
            type="date" 
            className="form-input" 
            style={{ width: "140px", height: "36px", padding: "0 8px", fontSize: "12px", marginBottom: 0 }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        {(startDate || endDate) && (
          <button 
            onClick={() => { setStartDate(""); setEndDate(""); }}
            style={{ fontSize: "12px", color: "var(--color-danger)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            Сбросить даты
          </button>
        )}
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
            { id: "all", label: "Все счетики" },
            { id: "draft", label: "Черновики" },
            { id: "issued", label: "Выставлены" },
            { id: "paid", label: "Оплачены" },
            { id: "overdue", label: "Просрочены" },
            { id: "cancelled", label: "Отменены" }
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

      {/* Table Container */}
      <div className="card-crm" style={{ padding: 0, overflowX: "auto", background: "white" }}>
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: "var(--font-small)",
          minWidth: "800px"
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
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-muted)" }}>
                  Счета по заданным критериям не найдены.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
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
                    <div style={{ display: "inline-flex", justifyContent: "flex-end", gap: "6px", flexWrap: "nowrap", alignItems: "center" }}>
                      
                      {/* Check Status (only for unpaid/issued/overdue Alfabank orders) */}
                      {["issued", "overdue"].includes(inv.status) && (
                        <button
                          onClick={() => handleCheckPaymentStatus(inv.id)}
                          disabled={payingInvoiceId === inv.id}
                          title="Проверить статус оплаты"
                          style={{
                            padding: "6px",
                            borderRadius: "6px",
                            border: "1px solid var(--color-border)",
                            background: "white",
                            color: "var(--color-text-muted)",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center"
                          }}
                        >
                          <RefreshCw size={14} className={payingInvoiceId === inv.id ? "spin" : ""} />
                        </button>
                      )}

                      {/* Repeat Payment Link */}
                      {["issued", "overdue"].includes(inv.status) && (
                        <button
                          onClick={() => handleCopyPaymentLink(inv.id)}
                          disabled={onlinePayingInvoiceId === inv.id}
                          title="Скопировать/Создать ссылку оплаты"
                          style={{
                            padding: "6px",
                            borderRadius: "6px",
                            border: "1px solid var(--color-border)",
                            background: "white",
                            color: "var(--color-primary-dark)",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center"
                          }}
                        >
                          <Copy size={14} />
                        </button>
                      )}

                      {/* Mark As Paid (Manual cash/card mark) */}
                      {inv.status !== "paid" && inv.status !== "cancelled" && (
                        <button
                          onClick={() => handleMarkAsPaid(inv.id)}
                          disabled={payingInvoiceId === inv.id}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "none",
                            background: "var(--color-success-soft)",
                            color: "var(--color-success)",
                            fontWeight: 700,
                            fontSize: "11px",
                            cursor: "pointer"
                          }}
                        >
                          Оплачен
                        </button>
                      )}

                      {/* Cancel Invoice */}
                      {inv.status !== "paid" && inv.status !== "cancelled" && (
                        <button
                          onClick={() => handleCancelInvoice(inv.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "none",
                            background: "var(--color-danger-soft)",
                            color: "var(--color-danger)",
                            fontWeight: 700,
                            fontSize: "11px",
                            cursor: "pointer"
                          }}
                        >
                          Отменить
                        </button>
                      )}

                      {inv.status === "paid" && (
                        <span style={{ color: "var(--color-success)", fontSize: "11px", fontWeight: 700 }}>Проведено</span>
                      )}

                      {inv.status === "cancelled" && (
                        <span style={{ color: "var(--color-text-muted)", fontSize: "11px", fontWeight: 600 }}>Аннулирован</span>
                      )}

                    </div>
                  </td>
                </tr>
              ))
            )}
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

              {/* Discount Info */}
              {loadingDiscount && (
                <div style={{ padding: "10px 14px", marginTop: "12px", borderRadius: "8px", background: "var(--color-bg-secondary, #f5f5f5)", color: "var(--color-text-muted)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                  Проверка скидок...
                </div>
              )}
              {!loadingDiscount && discountInfo && newAmount && (
                <div style={{ padding: "12px 14px", marginTop: "12px", borderRadius: "8px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", fontWeight: 600, fontSize: "13px", color: "var(--color-success, #16a34a)" }}>
                    <Percent size={14} />
                    {discountInfo.title} — {discountInfo.percent}%
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span>Сумма: {parseFloat(newAmount).toLocaleString("ru-RU")} ₽</span>
                    <span>Скидка: −{(parseFloat(newAmount) * discountInfo.percent / 100).toLocaleString("ru-RU")} ₽</span>
                    <span style={{ fontWeight: 600, color: "var(--color-text, inherit)" }}>Итого: {(parseFloat(newAmount) - parseFloat(newAmount) * discountInfo.percent / 100).toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>
              )}
              {!loadingDiscount && !discountInfo && newStudentId && (
                <div style={{ padding: "8px 14px", marginTop: "12px", fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Скидки не найдены
                </div>
              )}

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
      {actionModal}
    </div>
  );
}
