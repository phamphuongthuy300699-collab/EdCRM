"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@robotics-crm/ui";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  CreditCard, 
  Clock, 
  BookOpen, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle 
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { isDemoMode } from "@/shared/utils/demo";

interface Invoice {
  id: string;
  title: string;
  amount: number;
  status: "draft" | "issued" | "partially_paid" | "paid" | "cancelled" | "overdue";
  due_date: string;
}

interface AttendanceRecord {
  id: string;
  lesson_date: string;
  is_present: boolean;
  notes: string | null;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  // Groups for enrollment change
  const [groups, setGroups] = useState<any[]>([]);

  // Modals state
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);

  // Edit Profile form fields
  const [editStudentName, setEditStudentName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "paused" | "archived">("active");
  const [editNotes, setEditNotes] = useState("");
  const [editParentName, setEditParentName] = useState("");
  const [editParentPhone, setEditParentPhone] = useState("");
  const [editParentEmail, setEditParentEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Enrollment form fields
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [savingEnrollment, setSavingEnrollment] = useState(false);

  // Create Invoice form fields
  const [newInvoiceTitle, setNewInvoiceTitle] = useState("Абонемент на 8 занятий");
  const [newInvoiceAmount, setNewInvoiceAmount] = useState(4500);
  const [newInvoiceDueDate, setNewInvoiceDueDate] = useState("");
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Initialize due date on mount/load
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    setNewInvoiceDueDate(d.toISOString().split("T")[0]);
  }, []);

  // Mock data fallbacks for demo mode or numeric IDs
  const mockStudents = [
    { id: "1", name: "Игорь Петров", age: 8, birth_date: "2018-03-12", group: "LEGO Start 1", groupId: "g1", parent: "Анна Петрова", phone: "+7 (905) 555-12-34", email: "petrova@mail.ru", status: "active", level: "Конструктор 2", project: "Робот-сумо", notes: "Отличный конструктор, очень вовлечен." },
    { id: "2", name: "Данил Соловьев", age: 9, birth_date: "2017-07-22", group: "LEGO Start 1", groupId: "g1", parent: "Михаил С.", phone: "+7 (910) 333-22-11", email: "soloviev@mail.ru", status: "active", level: "Конструктор 2", project: "Кран-манипулятор", notes: "Любит конструировать сложные передачи." },
    { id: "3", name: "Алиса Волкова", age: 10, birth_date: "2016-11-05", group: "Scratch Basic", groupId: "g2", parent: "Сергей Волков", phone: "+7 (920) 222-33-44", email: "volkov@mail.ru", status: "active", level: "Аниматор Scratch", project: "Лабиринт", notes: "Иногда отвлекается, но программирует отлично." },
    { id: "4", name: "Кирилл Семенов", age: 7, birth_date: "2019-01-30", group: "LEGO Start 2", groupId: "g3", parent: "Ольга Семенова", phone: "+7 (915) 333-55-66", email: "semenova@mail.ru", status: "active", level: "Новичок", project: "Ветряк", notes: "Требует индивидуального внимания преподавателя." },
    { id: "5", name: "Даша Смирнова", age: 9, birth_date: "2017-05-15", group: "Scratch Basic", groupId: "g2", parent: "Елена Смирнова", phone: "+7 (903) 111-22-33", email: "smirnova@mail.ru", status: "active", level: "Кодер Scratch", project: "Кликер звезд", notes: "Очень быстро выполняет домашние задания." },
    { id: "6", name: "Максим Козлов", age: 12, birth_date: "2014-09-02", group: "Python Junior", groupId: "g4", parent: "Алексей К.", phone: "+7 (980) 444-55-66", email: "kozlov@mail.ru", status: "paused", level: "Разработчик", project: "Чат-бот", notes: "На паузе по семейным обстоятельствам." }
  ];

  const mockInvoices: Record<string, Invoice[]> = {
    "1": [
      { id: "i1", title: "Абонемент на Июнь (8 занятий)", amount: 4500, status: "paid", due_date: "2026-06-15" },
      { id: "i2", title: "Абонемент на Май (8 занятий)", amount: 4500, status: "paid", due_date: "2026-05-15" }
    ],
    "3": [
      { id: "i3", title: "Абонемент на Июнь (8 занятий)", amount: 4000, status: "issued", due_date: "2026-06-25" },
      { id: "i4", title: "Абонемент на Май (8 занятий)", amount: 4000, status: "paid", due_date: "2026-05-25" }
    ],
    "4": [
      { id: "i5", title: "Абонемент на Июнь (8 занятий)", amount: 4500, status: "overdue", due_date: "2026-06-10" },
      { id: "i6", title: "Абонемент на Май (8 занятий)", amount: 4500, status: "paid", due_date: "2026-05-10" }
    ]
  };

  const mockAttendance: Record<string, AttendanceRecord[]> = {
    "1": [
      { id: "a1", lesson_date: "2026-06-16", is_present: true, notes: "Собрал робота-сумо, отличный результат" },
      { id: "a2", lesson_date: "2026-06-09", is_present: true, notes: "Активно работал в паре" },
      { id: "a3", lesson_date: "2026-06-02", is_present: true, notes: "Урок 1: Введение" }
    ],
    "3": [
      { id: "a4", lesson_date: "2026-06-17", is_present: true, notes: "Закончила лабиринт" },
      { id: "a5", lesson_date: "2026-06-10", is_present: false, notes: "По болезни" },
      { id: "a6", lesson_date: "2026-06-03", is_present: true, notes: "Создали дизайн персонажей" }
    ]
  };

  async function loadData() {
    try {
      setLoading(true);
      const demo = isDemoMode();
      const isMockId = !isNaN(Number(studentId)) || studentId.startsWith("mock-") || studentId.length < 10;

      // Fetch active groups for the enrollment dropdown
      try {
        const { data: groupsData } = await supabase
          .from("groups")
          .select("id, title")
          .eq("status", "active");
        if (groupsData) {
          setGroups(groupsData);
        }
      } catch (gErr) {
        console.error("Error loading groups for dropdown:", gErr);
      }

      if (demo || isMockId) {
        const found = mockStudents.find(s => s.id === studentId) || mockStudents[0];
        setStudent(found);
        setEditStudentName(found.name);
        setEditBirthDate(found.birth_date);
        setEditStatus(found.status as any);
        setEditNotes(found.notes || "");
        setEditParentName(found.parent);
        setEditParentPhone(found.phone);
        setEditParentEmail(found.email || "");
        setSelectedGroupId(found.groupId || "");

        setInvoices(mockInvoices[found.id] || [
          { id: "i-default-1", title: "Оплата обучения (Июнь)", amount: 4500, status: "paid", due_date: "2026-06-15" }
        ]);
        setAttendance(mockAttendance[found.id] || [
          { id: "a-default-1", lesson_date: "2026-06-16", is_present: true, notes: "Работал над основным проектом" }
        ]);
        setLoading(false);
        return;
      }

      // Fetch Real DB Student
      const { data: s, error: sErr } = await (supabase
        .from("students") as any)
        .select(`
          id,
          full_name,
          birth_date,
          status,
          notes,
          organization_id,
          enrollments (
            group_id,
            groups (
              id,
              title,
              courses (title)
            )
          ),
          student_guardians (
            relation,
            guardians (
              id,
              full_name,
              phone,
              email
            )
          )
        `)
        .eq("id", studentId)
        .single();

      if (sErr || !s) {
        console.error("Fetch student error:", sErr);
        router.push("/crm/students");
        return;
      }

      // Format Student Profile
      const activeEnroll = s.enrollments?.find((e: any) => e.groups) || null;
      const groupTitle = activeEnroll ? activeEnroll.groups.title : "Без группы";
      const groupId = activeEnroll ? activeEnroll.groups.id : null;
      const courseTitle = activeEnroll ? activeEnroll.groups.courses?.title : "Робототехника";

      const parentLink = s.student_guardians?.[0]?.guardians || null;
      const parentId = parentLink ? parentLink.id : null;
      const parentName = parentLink ? parentLink.full_name : "Не указан";
      const parentPhone = parentLink ? parentLink.phone : "—";
      const parentEmail = parentLink ? parentLink.email : "—";

      let ageNum = 8;
      if (s.birth_date) {
        const diffMs = Date.now() - new Date(s.birth_date).getTime();
        ageNum = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
      }

      setStudent({
        id: s.id,
        name: s.full_name,
        age: ageNum,
        birth_date: s.birth_date || "",
        group: groupTitle,
        groupId,
        parent: parentName,
        guardianId: parentId,
        phone: parentPhone,
        email: parentEmail,
        status: s.status,
        level: courseTitle,
        project: s.notes || "Нет проекта",
        notes: s.notes,
        organization_id: s.organization_id
      });

      // Prepopulate form states
      setEditStudentName(s.full_name);
      setEditBirthDate(s.birth_date || "");
      setEditStatus(s.status);
      setEditNotes(s.notes || "");
      setEditParentName(parentName);
      setEditParentPhone(parentPhone);
      setEditParentEmail(parentEmail);
      setSelectedGroupId(groupId || "");

      // Fetch Invoices
      const { data: invs } = await (supabase
        .from("invoices") as any)
        .select("*")
        .eq("student_id", studentId)
        .order("due_date", { ascending: false });

      if (invs) {
        setInvoices(invs.map((i: any) => ({
          id: i.id,
          title: i.title || "Оплата обучения",
          amount: i.amount,
          status: i.status,
          due_date: i.due_date
        })));
      }

      // Fetch Attendance
      const { data: att } = await (supabase
        .from("attendance") as any)
        .select("*")
        .eq("student_id", studentId)
        .order("lesson_date", { ascending: false });

      if (att) {
        setAttendance(att.map((a: any) => ({
          id: a.id,
          lesson_date: a.lesson_date,
          is_present: a.is_present,
          notes: a.notes
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [studentId]);

  const handlePayInvoice = async (invoiceId: string) => {
    if (payingInvoiceId) return;
    try {
      setPayingInvoiceId(invoiceId);

      const demo = isDemoMode();
      const isMockId = !isNaN(Number(studentId)) || studentId.startsWith("mock-") || studentId.length < 10;

      if (demo || isMockId) {
        setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: "paid" } : inv));
        alert("Демонстрационный счет оплачен!");
        return;
      }

      // Create Payment Transaction and update invoice
      const targetInvoice = invoices.find(inv => inv.id === invoiceId);
      if (!targetInvoice) return;

      const { error: paymentErr } = await (supabase
        .from("payments") as any)
        .insert({
          organization_id: student.organization_id || "7f8d5918-a6fe-4fbe-9b37-236b28ee2e7b",
          student_id: student.id,
          invoice_id: invoiceId,
          amount: targetInvoice.amount,
          provider: "manual",
          status: "paid",
          paid_at: new Date().toISOString()
        });

      if (paymentErr) throw paymentErr;

      const { error: invUpdateErr } = await (supabase
        .from("invoices") as any)
        .update({ status: "paid" })
        .eq("id", invoiceId);

      if (invUpdateErr) throw invUpdateErr;

      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: "paid" } : inv));
      alert("Счет успешно оплачен!");
    } catch (err: any) {
      console.error(err);
      alert("Ошибка при оплате счета: " + err.message);
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingProfile) return;
    try {
      setSavingProfile(true);
      const demo = isDemoMode();
      const isMockId = !isNaN(Number(studentId)) || studentId.startsWith("mock-") || studentId.length < 10;

      if (demo || isMockId) {
        setStudent((prev: any) => ({
          ...prev,
          name: editStudentName,
          birth_date: editBirthDate,
          status: editStatus,
          notes: editNotes,
          project: editNotes || prev.project,
          parent: editParentName,
          phone: editParentPhone,
          email: editParentEmail,
          age: editBirthDate ? Math.floor((Date.now() - new Date(editBirthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : prev.age
        }));
        setShowEditProfileModal(false);
        alert("Профиль сохранен (Демо-режим)!");
        return;
      }

      // Update Student in Supabase
      const { error: studentErr } = await (supabase
        .from("students") as any)
        .update({
          full_name: editStudentName,
          birth_date: editBirthDate || null,
          status: editStatus,
          notes: editNotes
        })
        .eq("id", student.id);

      if (studentErr) throw studentErr;

      // Update Guardian in Supabase
      if (student.guardianId) {
        const { error: guardianErr } = await (supabase
          .from("guardians") as any)
          .update({
            full_name: editParentName,
            phone: editParentPhone,
            email: editParentEmail || null
          })
          .eq("id", student.guardianId);

        if (guardianErr) throw guardianErr;
      }

      // Reload Student Details
      await loadData();
      setShowEditProfileModal(false);
      alert("Профиль успешно сохранен!");
    } catch (err: any) {
      console.error(err);
      alert("Ошибка сохранения профиля: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingEnrollment) return;
    try {
      setSavingEnrollment(true);
      const demo = isDemoMode();
      const isMockId = !isNaN(Number(studentId)) || studentId.startsWith("mock-") || studentId.length < 10;

      const newGroupObj = groups.find(g => g.id === selectedGroupId);
      const newGroupTitle = newGroupObj ? newGroupObj.title : "Без группы";

      if (demo || isMockId) {
        setStudent((prev: any) => ({
          ...prev,
          group: newGroupTitle,
          groupId: selectedGroupId
        }));
        setShowEnrollmentModal(false);
        alert("Группа изменена (Демо-режим)!");
        return;
      }

      // Cancel current active/paused enrollments for this student
      const { error: cancelErr } = await (supabase
        .from("enrollments") as any)
        .update({ status: "cancelled", ended_on: new Date().toISOString().split("T")[0] })
        .eq("student_id", student.id)
        .in("status", ["active", "paused"]);

      if (cancelErr) throw cancelErr;

      // Insert new enrollment if new group is selected
      if (selectedGroupId) {
        const { error: enrollErr } = await (supabase
          .from("enrollments") as any)
          .insert({
            organization_id: student.organization_id,
            student_id: student.id,
            group_id: selectedGroupId,
            status: "active",
            started_on: new Date().toISOString().split("T")[0]
          });

        if (enrollErr) throw enrollErr;
      }

      // Reload Student Details
      await loadData();
      setShowEnrollmentModal(false);
      alert("Учебная группа изменена!");
    } catch (err: any) {
      console.error(err);
      alert("Ошибка смены группы: " + err.message);
    } finally {
      setSavingEnrollment(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingInvoice) return;
    try {
      setCreatingInvoice(true);
      const demo = isDemoMode();
      const isMockId = !isNaN(Number(studentId)) || studentId.startsWith("mock-") || studentId.length < 10;

      if (demo || isMockId) {
        const newMockInv: Invoice = {
          id: "i-mock-" + Date.now(),
          title: newInvoiceTitle,
          amount: newInvoiceAmount,
          status: "issued",
          due_date: newInvoiceDueDate
        };
        setInvoices([newMockInv, ...invoices]);
        setShowCreateInvoiceModal(false);
        alert("Счет выставлен (Демо-режим)!");
        return;
      }

      // Find active enrollment ID to link
      const { data: activeEnrollment } = await (supabase
        .from("enrollments") as any)
        .select("id")
        .eq("student_id", student.id)
        .eq("status", "active")
        .maybeSingle();

      const { data: newInv, error: invErr } = await (supabase
        .from("invoices") as any)
        .insert({
          organization_id: student.organization_id,
          student_id: student.id,
          guardian_id: student.guardianId || null,
          enrollment_id: activeEnrollment?.id || null,
          title: newInvoiceTitle,
          description: newInvoiceTitle,
          amount: newInvoiceAmount,
          currency: "RUB",
          due_date: newInvoiceDueDate,
          status: "issued",
          issued_at: new Date().toISOString()
        })
        .select()
        .single() as any;

      if (invErr) throw invErr;

      setInvoices(prev => [
        {
          id: newInv.id,
          title: newInv.title,
          amount: newInv.amount,
          status: newInv.status,
          due_date: newInv.due_date
        },
        ...prev
      ]);

      setShowCreateInvoiceModal(false);
      alert("Счет успешно выставлен!");
    } catch (err: any) {
      console.error(err);
      alert("Ошибка выставления счета: " + err.message);
    } finally {
      setCreatingInvoice(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)" }}>Загрузка профиля ученика...</div>;
  }

  if (!student) {
    return <div style={{ padding: "40px", textAlign: "center", color: "var(--color-danger)" }}>Ученик не найден</div>;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <span className="badge badge-green">Активен</span>;
      case "paused": return <span className="badge badge-amber">На паузе</span>;
      case "archived": return <span className="badge badge-gray">В архиве</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <span className="badge badge-green">Оплачено</span>;
      case "pending":
      case "issued":
      case "draft": return <span className="badge badge-blue">Ожидает</span>;
      case "partially_paid": return <span className="badge badge-amber">Частично</span>;
      case "overdue": return <span className="badge badge-red">Просрочен</span>;
      case "cancelled": return <span className="badge badge-gray">Отменен</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  const balance = invoices.reduce((acc, curr) => {
    if (curr.status === "paid") return acc;
    return acc - curr.amount;
  }, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "20px" }}>
      {/* Back button */}
      <div>
        <Link href="/crm/students" style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "var(--color-text-muted)", fontSize: "14px", fontWeight: 600 }}>
          <ArrowLeft size={16} />
          <span>К списку учеников</span>
        </Link>
      </div>

      {/* Main Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border)", paddingBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "var(--color-primary-soft)",
            color: "var(--color-primary-dark)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "24px"
          }}>
            {student.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, fontFamily: "var(--font-geologica)" }}>{student.name}</h1>
              {getStatusBadge(student.status)}
            </div>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0 }}>
              Дата рождения: {student.birth_date ? new Date(student.birth_date).toLocaleDateString("ru-RU") : "Не указана"} ({student.age} лет)
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button onClick={() => setShowEditProfileModal(true)} variant="secondary-site" style={{ height: "36px", padding: "0 12px", fontSize: "12px" }}>
                Редактировать профиль
              </Button>
              <Button onClick={() => setShowEnrollmentModal(true)} variant="secondary-site" style={{ height: "36px", padding: "0 12px", fontSize: "12px" }}>
                Изменить группу
              </Button>
            </div>
            <Button onClick={() => setShowCreateInvoiceModal(true)} variant="primary-crm" style={{ height: "36px", fontSize: "12px" }}>
              Выставить счет
            </Button>
          </div>

          {/* Balance Status */}
          <div style={{
            background: balance < 0 ? "var(--color-danger-soft)" : "var(--color-success-soft)",
            border: `1px solid ${balance < 0 ? "var(--color-danger)" : "var(--color-success)"}`,
            padding: "16px 24px",
            borderRadius: "12px",
            textAlign: "right"
          }}>
            <div style={{ fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Баланс абонемента</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: balance < 0 ? "var(--color-danger-dark)" : "var(--color-success-dark)" }}>
              {balance === 0 ? "0 ₽" : `${balance} ₽`}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "32px" }}>
        
        {/* Left Side: General Profile, Guardians and Notes */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Group details */}
          <div className="card-crm" style={{ background: "white", padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <BookOpen size={18} style={{ color: "var(--color-primary)" }} />
              <span>Обучение</span>
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Учебная группа</span>
                {student.groupId ? (
                  <div style={{ fontWeight: 700, fontSize: "15px", marginTop: "4px" }}>
                    <Link href={`/crm/groups?open=${student.groupId}`} style={{ color: "var(--color-primary)", textDecoration: "none" }}>
                      {student.group}
                    </Link>
                  </div>
                ) : (
                  <div style={{ fontWeight: 700, fontSize: "15px", marginTop: "4px" }}>{student.group}</div>
                )}
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Курс</span>
                <div style={{ fontWeight: 700, fontSize: "15px", marginTop: "4px" }}>{student.level || "Не определен"}</div>
              </div>
            </div>
          </div>

          {/* Guardian Info */}
          <div className="card-crm" style={{ background: "white", padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <User size={18} style={{ color: "var(--color-primary)" }} />
              <span>Контакты представителя</span>
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>ФИО родителя</span>
                <div style={{ fontWeight: 700, fontSize: "15px", marginTop: "4px" }}>{student.parent}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Телефон</span>
                  <div style={{ fontWeight: 700, fontSize: "15px", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Phone size={14} style={{ color: "var(--color-text-muted)" }} />
                    <span>{student.phone}</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Email</span>
                  <div style={{ fontWeight: 700, fontSize: "15px", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Mail size={14} style={{ color: "var(--color-text-muted)" }} />
                    <span>{student.email || "Не указан"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Projects and comments */}
          <div className="card-crm" style={{ background: "white", padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={18} style={{ color: "var(--color-primary)" }} />
              <span>Прогресс и заметки</span>
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Текущий проект</span>
                <div style={{ fontWeight: 700, fontSize: "15px", marginTop: "4px" }}>{student.project || "Не начат"}</div>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Служебные примечания куратора</span>
                <div style={{ fontSize: "14px", color: "var(--color-text)", marginTop: "4px", fontStyle: "italic", background: "var(--color-bg)", padding: "12px", borderRadius: "8px" }}>
                  {student.notes || "Примечания отсутствуют."}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Billing & Invoicing, Attendance list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Invoicing Section */}
          <div className="card-crm" style={{ background: "white", padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <CreditCard size={18} style={{ color: "var(--color-primary)" }} />
              <span>Выставленные счета</span>
            </h3>
            {invoices.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", fontStyle: "italic", fontSize: "14px" }}>Счетов еще не выставлено.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {invoices.map(inv => {
                  const dueDate = new Date(inv.due_date).toLocaleDateString("ru-RU");
                  return (
                    <div 
                      key={inv.id} 
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        background: "var(--color-bg)"
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontWeight: 700, fontSize: "14px" }}>{inv.title}</span>
                        <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Срок оплаты: {dueDate}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                          <span style={{ fontWeight: 800, fontSize: "14px" }}>{inv.amount} ₽</span>
                          {getInvoiceStatusBadge(inv.status)}
                        </div>
                        {(inv.status === "issued" || inv.status === "draft" || inv.status === "partially_paid" || inv.status === "overdue") && (
                          <Button 
                            onClick={() => handlePayInvoice(inv.id)}
                            disabled={payingInvoiceId === inv.id}
                            variant="primary-crm"
                            style={{ padding: "6px 12px", fontSize: "12px", height: "32px" }}
                          >
                            {payingInvoiceId === inv.id ? "..." : "Оплатить"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Attendance Section */}
          <div className="card-crm" style={{ background: "white", padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={18} style={{ color: "var(--color-primary)" }} />
              <span>История посещаемости</span>
            </h3>
            {attendance.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", fontStyle: "italic", fontSize: "14px" }}>Посещаемость еще не отмечалась.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {attendance.map(record => {
                  const recordDate = new Date(record.lesson_date).toLocaleDateString("ru-RU");
                  return (
                    <div 
                      key={record.id} 
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderBottom: "1px solid var(--color-border)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {record.is_present ? (
                          <CheckCircle size={16} style={{ color: "var(--color-success)" }} />
                        ) : (
                          <XCircle size={16} style={{ color: "var(--color-danger)" }} />
                        )}
                        <span style={{ fontWeight: 600, fontSize: "14px" }}>{recordDate}</span>
                      </div>
                      <span style={{ fontSize: "12px", color: "var(--color-text-muted)", textAlign: "right" }}>
                        {record.is_present ? (record.notes || "Был на уроке") : (record.notes || "Пропустил")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
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
            maxWidth: "460px",
            padding: "32px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "24px"
          }}>
            <div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "4px" }}>Редактировать профиль</h3>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Обновление данных ученика и его представителя</p>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">ФИО Ученика *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={editStudentName}
                    onChange={(e) => setEditStudentName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Дата рождения</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Статус ученика *</label>
                <select 
                  className="form-input" 
                  required
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                >
                  <option value="active">Активен</option>
                  <option value="paused">На паузе</option>
                  <option value="archived">В архиве</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Заметки / проект</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "12px", marginTop: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                  Контакты Родителя:
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">ФИО Родителя *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={editParentName}
                  onChange={(e) => setEditParentName(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Телефон *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={editParentPhone}
                    onChange={(e) => setEditParentPhone(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={editParentEmail}
                    onChange={(e) => setEditParentEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <Button 
                  type="button" 
                  variant="secondary-site" 
                  style={{ flex: 1 }}
                  disabled={savingProfile}
                  onClick={() => setShowEditProfileModal(false)}
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  variant="primary-crm" 
                  style={{ flex: 1 }}
                  disabled={savingProfile}
                >
                  {savingProfile ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Group Enrollment Modal */}
      {showEnrollmentModal && (
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
            maxWidth: "400px",
            padding: "32px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "24px"
          }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "4px" }}>Изменить учебную группу</h3>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Предыдущее зачисление будет завершено</p>
            </div>

            <form onSubmit={handleSaveEnrollment} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Выберите группу</label>
                <select 
                  className="form-input" 
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  <option value="">Без группы (отчислить)</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <Button 
                  type="button" 
                  variant="secondary-site" 
                  style={{ flex: 1 }}
                  disabled={savingEnrollment}
                  onClick={() => setShowEnrollmentModal(false)}
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  variant="primary-crm" 
                  style={{ flex: 1 }}
                  disabled={savingEnrollment}
                >
                  {savingEnrollment ? "Сохранение..." : "Подтвердить"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateInvoiceModal && (
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
            maxWidth: "400px",
            padding: "32px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "24px"
          }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "4px" }}>Выставить новый счет</h3>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Создание счета на оплату занятий</p>
            </div>

            <form onSubmit={handleCreateInvoice} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Название платежа *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={newInvoiceTitle}
                  onChange={(e) => setNewInvoiceTitle(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Сумма (₽) *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    required
                    min="0"
                    value={newInvoiceAmount}
                    onChange={(e) => setNewInvoiceAmount(Number(e.target.value))}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Срок оплаты *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    required
                    value={newInvoiceDueDate}
                    onChange={(e) => setNewInvoiceDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <Button 
                  type="button" 
                  variant="secondary-site" 
                  style={{ flex: 1 }}
                  disabled={creatingInvoice}
                  onClick={() => setShowCreateInvoiceModal(false)}
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  variant="primary-crm" 
                  style={{ flex: 1 }}
                  disabled={creatingInvoice}
                >
                  {creatingInvoice ? "Выставление..." : "Выставить счет"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
