"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  CreditCard, 
  Calendar, 
  MoreVertical,
  Activity,
  Award,
  CheckCircle2
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";

interface Student {
  id: string | number;
  name: string;
  age: number;
  group: string;
  parent: string;
  phone: string;
  paymentStatus: "paid" | "pending" | "overdue";
  attendance: string; // Rate string (e.g. "95%")
  attendanceValue: number; // Numeric rate (e.g. 95)
  status: "active" | "paused" | "archived";
  level: string;
  project: string;
  homeworkProgress: number; // Homework score (0-100)
}

export default function CrmStudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "archived">("all");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newBirthDate, setNewBirthDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newParentName, setNewParentName] = useState("");
  const [newParentPhone, setNewParentPhone] = useState("");
  const [newParentEmail, setNewParentEmail] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groups, setGroups] = useState<any[]>([]);

  // Drawer details state
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentInvoices, setStudentInvoices] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [loadingDrawer, setLoadingDrawer] = useState(false);

  const supabase = createSupabaseBrowserClient();

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      { bg: "#E0F2FE", text: "#0369A1" }, // Blue
      { bg: "#DCFCE7", text: "#15803D" }, // Green
      { bg: "#FEF3C7", text: "#B45309" }, // Yellow/Amber
      { bg: "#F3E8FF", text: "#6B21A8" }, // Purple
      { bg: "#FEE2E2", text: "#B91C1C" }, // Red
      { bg: "#E0F2F1", text: "#00796B" }, // Teal
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const initialStudents: Student[] = [
    { id: 1, name: "Игорь Петров", age: 8, group: "LEGO Start 1", parent: "Анна Петрова", phone: "+7 (905) 555-12-34", paymentStatus: "paid", attendance: "100%", attendanceValue: 100, status: "active", level: "Конструктор 2", project: "Робот-сумо", homeworkProgress: 90 },
    { id: 2, name: "Данил Соловьев", age: 9, group: "LEGO Start 1", parent: "Михаил С.", phone: "+7 (910) 333-22-11", paymentStatus: "paid", attendance: "90%", attendanceValue: 90, status: "active", level: "Конструктор 2", project: "Кран-манипулятор", homeworkProgress: 80 },
    { id: 3, name: "Алиса Волкова", age: 10, group: "Scratch Basic", parent: "Сергей Волков", phone: "+7 (920) 222-33-44", paymentStatus: "pending", attendance: "95%", attendanceValue: 95, status: "active", level: "Аниматор Scratch", project: "Лабиринт", homeworkProgress: 85 },
    { id: 4, name: "Кирилл Семенов", age: 7, group: "LEGO Start 2", parent: "Ольга Семенова", phone: "+7 (915) 333-55-66", paymentStatus: "overdue", attendance: "80%", attendanceValue: 80, status: "active", level: "Новичок", project: "Ветряк", homeworkProgress: 60 },
    { id: 5, name: "Даша Смирнова", age: 9, group: "Scratch Basic", parent: "Елена Смирнова", phone: "+7 (903) 111-22-33", paymentStatus: "paid", attendance: "100%", attendanceValue: 100, status: "active", level: "Кодер Scratch", project: "Кликер звезд", homeworkProgress: 95 },
    { id: 6, name: "Максим Козлов", age: 12, group: "Python Junior", parent: "Алексей К.", phone: "+7 (980) 444-55-66", paymentStatus: "paid", attendance: "85%", attendanceValue: 85, status: "paused", level: "Разработчик", project: "Чат-бот", homeworkProgress: 75 }
  ];

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Get org
        const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
        if (!orgRes.data) throw new Error("Organization not found");

        // Fetch groups
        const { data: groupsData } = await supabase
          .from("groups")
          .select("id, title, status")
          .eq("status", "active");
        if (groupsData) setGroups(groupsData);

        // Fetch students along with guardians details
        const { data: studentsData } = await supabase
          .from("students")
          .select(`
            id,
            full_name,
            birth_date,
            status,
            notes,
            enrollments (
              group_id,
              groups (
                title,
                courses (title)
              )
            ),
            student_guardians (
              relation,
              guardians (
                full_name,
                phone,
                email
              )
            )
          `)
          .eq("organization_id", orgRes.data.id);

        // Fetch attendance
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("student_id, is_present")
          .eq("organization_id", orgRes.data.id);

        if (studentsData && studentsData.length > 0) {
          const formatted = studentsData.map((s: any) => {
            // Find active enrollments
            const activeEnroll = s.enrollments?.find((e: any) => e.groups) || null;
            const groupTitle = activeEnroll ? activeEnroll.groups.title : "Без группы";
            const courseTitle = activeEnroll ? activeEnroll.groups.courses?.title : "Робототехника";

            // Find primary guardian
            const parentLink = s.student_guardians?.[0]?.guardians || null;
            const parentName = parentLink ? parentLink.full_name : "Не указан";
            const parentPhone = parentLink ? parentLink.phone : "—";

            // Calculate attendance rate
            const sAtt = attendanceData?.filter((a: any) => a.student_id === s.id) || [];
            const totalAtt = sAtt.length;
            const presentAtt = sAtt.filter((a: any) => a.is_present).length;
            const attVal = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

            // Age calculation
            let ageNum = 8;
            if (s.birth_date) {
              const diffMs = Date.now() - new Date(s.birth_date).getTime();
              ageNum = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
            }

            return {
              id: s.id,
              name: s.full_name,
              age: ageNum,
              group: groupTitle,
              parent: parentName,
              phone: parentPhone,
              paymentStatus: "paid" as const,
              attendance: `${attVal}%`,
              attendanceValue: attVal,
              status: s.status,
              level: courseTitle === "LEGO Start" ? "Конструктор" : "Программист",
              project: s.notes || "Первый проект",
              homeworkProgress: attVal > 80 ? 90 : 70
            };
          });

          setStudents([...formatted, ...initialLeadsAsStudents(initialStudents, formatted)]);
        } else {
          setStudents(initialStudents);
        }
      } catch (err) {
        console.error("Error loading students list:", err);
        setStudents(initialStudents);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function initialLeadsAsStudents(mocks: Student[], dbStudents: any[]) {
    return mocks.filter(m => !dbStudents.some((d: any) => d.name === m.name));
  }

  const handleOpenDrawer = async (student: any) => {
    setSelectedStudent(student);
    setStudentInvoices([]);
    setStudentAttendance([]);
    
    if (typeof student.id === "number") {
      setStudentInvoices([
        { id: "i-mock-1", title: "Абонемент на Июнь", amount: 4500, status: "paid", due_date: "2026-06-15" },
        { id: "i-mock-2", title: "Абонемент на Май", amount: 4500, status: "paid", due_date: "2026-05-15" }
      ]);
      setStudentAttendance([
        { lesson_date: "2026-06-16", is_present: true },
        { lesson_date: "2026-06-09", is_present: true },
        { lesson_date: "2026-06-02", is_present: true }
      ]);
      return;
    }

    try {
      setLoadingDrawer(true);
      // Fetch invoices
      const { data: invs } = await supabase
        .from("invoices")
        .select("*")
        .eq("student_id", student.id)
        .order("due_date", { ascending: false });
      
      if (invs) setStudentInvoices(invs);

      // Fetch attendance
      const { data: att } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", student.id)
        .order("lesson_date", { ascending: false });

      if (att) setStudentAttendance(att);
    } catch (err) {
      console.error("Error loading drawer details:", err);
    } finally {
      setLoadingDrawer(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Get org
      const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
      if (!orgRes.data) throw new Error("Organization not found");
      const organizationId = orgRes.data.id;

      // 1. Create Student
      const { data: student, error: stError } = await (supabase.from("students") as any).insert({
        organization_id: organizationId,
        full_name: newStudentName,
        birth_date: newBirthDate || null,
        status: "active",
        notes: newNotes || null
      }).select().single();

      if (stError) throw stError;

      // 2. Create Guardian
      const { data: guardian, error: gError } = await (supabase.from("guardians") as any).insert({
        organization_id: organizationId,
        full_name: newParentName,
        phone: newParentPhone,
        email: newParentEmail || null
      }).select().single();

      if (gError) throw gError;

      // 3. Link them
      await (supabase.from("student_guardians") as any).insert({
        organization_id: organizationId,
        student_id: student.id,
        guardian_id: guardian.id,
        relation: "Родитель",
        is_primary: true
      });

      // 4. Enroll in group if group selected
      let groupTitle = "Без группы";
      let level = "Робототехника";
      if (selectedGroupId) {
        const selGroup = groups.find(g => g.id === selectedGroupId);
        groupTitle = selGroup ? selGroup.title : "Без группы";
        level = "Активный ученик";

        await (supabase.from("enrollments") as any).insert({
          organization_id: organizationId,
          student_id: student.id,
          group_id: selectedGroupId,
          status: "active",
          started_on: new Date().toISOString().split("T")[0]
        });
      }

      // 5. Append student to local state list
      const newStudentObj: Student = {
        id: student.id,
        name: student.full_name,
        age: newBirthDate ? Math.floor((Date.now() - new Date(newBirthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 8,
        group: groupTitle,
        parent: guardian.full_name,
        phone: guardian.phone,
        paymentStatus: "paid",
        attendance: "100%",
        attendanceValue: 100,
        status: "active",
        level,
        project: student.notes || "Первый проект",
        homeworkProgress: 100
      };

      setStudents([newStudentObj, ...students]);
      setShowAddModal(false);

      // Reset form
      setNewStudentName("");
      setNewBirthDate("");
      setNewNotes("");
      setNewParentName("");
      setNewParentPhone("");
      setNewParentEmail("");
      setSelectedGroupId("");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось создать ученика: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return <span className="badge badge-green">Оплачено</span>;
      case "pending": return <span className="badge badge-blue">Ожидает</span>;
      case "overdue": return <span className="badge badge-red">Долг</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <span className="badge badge-green">Активен</span>;
      case "paused": return <span className="badge badge-amber">На паузе</span>;
      case "archived": return <span className="badge badge-gray">В архиве</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      student.parent.toLowerCase().includes(searchQuery.toLowerCase()) || 
      student.group.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
            База учеников
          </h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
            Активных учеников в филиале: {students.filter(s => s.status === "active").length}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} variant="primary-crm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <UserPlus size={16} />
          <span>Создать ученика</span>
        </Button>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--color-border)",
        paddingBottom: "12px",
        gap: "24px"
      }}>
        {/* Status filters */}
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { id: "all", label: "Все ученики" },
            { id: "active", label: "Активные" },
            { id: "paused", label: "На паузе" },
            { id: "archived", label: "В архиве" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "var(--font-small)",
                fontWeight: statusFilter === tab.id ? 700 : 500,
                border: "none",
                cursor: "pointer",
                background: statusFilter === tab.id ? "var(--color-primary-soft)" : "transparent",
                color: statusFilter === tab.id ? "var(--color-primary-dark)" : "var(--color-text-muted)",
                transition: "all 0.2s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
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
            placeholder="Поиск ученика, группы..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="card-crm" style={{ padding: 0, overflow: "hidden", background: "white" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)" }}>Загрузка учеников...</div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: "64px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <Users size={48} style={{ color: "var(--color-text-muted)", opacity: 0.5 }} />
            <div>
              <h4 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Учеников не найдено</h4>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Попробуйте скорректировать условия поиска.</p>
            </div>
          </div>
        ) : (
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
                <th style={{ padding: "0 24px" }}>Ученик</th>
                <th>Учебная группа / EdTech Прогресс</th>
                <th>Успеваемость (Посещаемость + ДЗ)</th>
                <th>Родитель</th>
                <th>Телефон</th>
                <th>Оплата</th>
                <th>Статус</th>
                <th style={{ padding: "0 24px", textAlign: "right" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => {
                // Calculate combined progress index
                const combinedScore = Math.round(student.attendanceValue * 0.6 + student.homeworkProgress * 0.4);
                let progressColor = "var(--color-success)";
                if (combinedScore < 75) progressColor = "var(--color-warning)";
                if (combinedScore < 60) progressColor = "var(--color-danger)";

                return (
                  <tr key={student.id} style={{
                    borderBottom: "1px solid var(--color-border)",
                    height: "72px",
                    transition: "background 0.2s"
                  }} className="table-row">
                    <td style={{ padding: "0 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: getAvatarColor(student.name).bg,
                          color: getAvatarColor(student.name).text,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "var(--font-xs)"
                        }}>
                          {getInitials(student.name)}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{student.name}</span>
                          <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{student.age} лет</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 700, color: "var(--color-text)" }}>{student.group}</span>
                        <span style={{ fontSize: "11px", color: "var(--color-primary-dark)", fontWeight: 500 }}>
                          {student.level} · Проект: {student.project}
                        </span>
                      </div>
                    </td>
                    
                    {/* Visual Progress Score */}
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "160px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                            <Activity size={10} style={{ color: "var(--color-text-muted)" }} />
                            <span>Прогресс:</span>
                          </span>
                          <span style={{ color: progressColor }}>{combinedScore}%</span>
                        </div>
                        {/* Progress Bar Container */}
                        <div style={{ width: "100%", height: "6px", background: "var(--color-border)", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${combinedScore}%`, height: "100%", background: progressColor, borderRadius: "3px", transition: "width 0.3s" }} />
                        </div>
                        <span style={{ fontSize: "9px", color: "var(--color-text-muted)" }}>
                          Посещ: {student.attendance} · ДЗ: {student.homeworkProgress}%
                        </span>
                      </div>
                    </td>

                    <td>{student.parent}</td>
                    <td>{student.phone}</td>
                    <td>{getPaymentStatusBadge(student.paymentStatus)}</td>
                    <td>{getStatusBadge(student.status)}</td>
                    <td style={{ padding: "0 24px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button title="Контакты" style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "6px",
                          border: "1px solid var(--color-border)",
                          background: "white",
                          color: "var(--color-text)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}>
                          <Phone size={14} />
                        </button>
                        <button title="История оплат" style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "6px",
                          border: "1px solid var(--color-border)",
                          background: "white",
                          color: "var(--color-text)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}>
                          <CreditCard size={14} />
                        </button>
                        <button onClick={() => handleOpenDrawer(student)} title="Подробнее" style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "6px",
                          border: "1px solid var(--color-border)",
                          background: "white",
                          color: "var(--color-text)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer"
                        }}>
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {/* Add Student Modal */}
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
            maxWidth: "460px",
            padding: "32px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "24px"
          }}>
            <div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "4px" }}>Добавить ученика вручную</h3>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Создание карточки ученика и родителя</p>
            </div>

            <form onSubmit={handleCreateStudent} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">ФИО Ученика *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Миша Петров" 
                    required 
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Дата рождения</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newBirthDate}
                    onChange={(e) => setNewBirthDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Учебная группа</label>
                <select 
                  className="form-input" 
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  <option value="">Без группы</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Заметки / проект</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Например: Проект робота-сумоиста" 
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
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
                  placeholder="Анна Петрова" 
                  required 
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Телефон *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="+7 (905) 555-12-34" 
                    required 
                    value={newParentPhone}
                    onChange={(e) => setNewParentPhone(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="parent@mail.ru" 
                    value={newParentEmail}
                    onChange={(e) => setNewParentEmail(e.target.value)}
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

      {/* Details Drawer */}
      {selectedStudent && (
        <div style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "480px",
          background: "white",
          borderLeft: "1px solid var(--color-border)",
          boxShadow: "-10px 0 30px rgba(15, 23, 42, 0.08)",
          zIndex: 45,
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          overflowY: "auto"
        }}>
          {/* Drawer Header */}
          <div style={{ display: "flex", justifySelf: "flex-start", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--color-border)", paddingBottom: "20px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>{selectedStudent.name}</h3>
                {getStatusBadge(selectedStudent.status)}
              </div>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>
                Группа: <strong>{selectedStudent.group}</strong> · Курс: {selectedStudent.level}
              </p>
            </div>
            <button 
              onClick={() => setSelectedStudent(null)}
              style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
            >
              Закрыть [x]
            </button>
          </div>

          {/* Student Info Body */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Guardian Card Info */}
            <div style={{ background: "var(--color-bg)", padding: "16px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Родитель (законный представитель)</span>
              <div><strong>ФИО:</strong> {selectedStudent.parent}</div>
              <div><strong>Телефон:</strong> {selectedStudent.phone}</div>
            </div>

            {/* Performance progress */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)" }}>Успеваемость и прогресс ДЗ</span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1, height: "8px", background: "var(--color-border)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${selectedStudent.homeworkProgress}%`, height: "100%", background: "var(--color-primary)" }} />
                </div>
                <span style={{ fontWeight: 700 }}>{selectedStudent.homeworkProgress}%</span>
              </div>
            </div>

            {/* Invoices List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>История Счетов</span>
              
              {loadingDrawer ? (
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Загрузка счетов...</span>
              ) : studentInvoices.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {studentInvoices.map((inv: any) => (
                    <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "12px" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{inv.title || "Абонемент"}</div>
                        <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Срок: {new Date(inv.due_date).toLocaleDateString("ru-RU")}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 700 }}>{inv.amount} ₽</span>
                        {getPaymentStatusBadge(inv.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)", fontStyle: "italic" }}>Нет выставленных счетов</span>
              )}
            </div>

            {/* Attendance checklist history */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Посещаемость занятий</span>

              {loadingDrawer ? (
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Загрузка занятий...</span>
              ) : studentAttendance.length > 0 ? (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {studentAttendance.map((att: any, idx) => (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", minWidth: "50px", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: att.is_present ? "var(--color-success)" : "var(--color-danger)" }}>
                        {att.is_present ? "Был" : "Н/Б"}
                      </span>
                      <span style={{ fontSize: "9px", color: "var(--color-text-muted)" }}>
                        {new Date(att.lesson_date).toLocaleDateString("ru-RU", { month: "numeric", day: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)", fontStyle: "italic" }}>Нет отметок посещаемости</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
