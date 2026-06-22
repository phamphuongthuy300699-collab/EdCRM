"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import Link from "next/link";
import { 
  Inbox, 
  Search, 
  PhoneCall, 
  UserCheck, 
  XCircle, 
  Plus,
  Calendar,
  MessageSquare,
  Clock,
  ChevronRight,
  User,
  AlertTriangle,
  HelpCircle,
  Hash,
  X
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";

interface Lead {
  id: string | number;
  parentName: string;
  phone: string;
  childName: string;
  childAge: number | null;
  course: string;
  courseId?: string | null;
  status: "new" | "contacted" | "trial_scheduled" | "converted" | "lost";
  date: string;
  source: string;
  convertedStudentId?: string | null;
  convertedGuardianId?: string | null;
}

interface Interaction {
  id: string;
  type: string;
  result: string | null;
  summary: string | null;
  next_action_at: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

interface Objection {
  id: string;
  title: string;
  category: string | null;
  recommended_answer: string;
  tags: string[];
}

export default function CrmLeadsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "new" | "contacted" | "trial_scheduled" | "converted" | "lost">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");

  const initialLeads: Lead[] = [
    { id: 1, parentName: "Анна Петрова", phone: "+7 (905) 555-12-34", childName: "Игорь", childAge: 8, course: "Робототехника LEGO", status: "new", date: "20.06.2026", source: "Форма на сайте" },
    { id: 2, parentName: "Сергей Волков", phone: "+7 (920) 222-33-44", childName: "Алиса", childAge: 10, course: "Программирование Scratch", status: "new", date: "20.06.2026", source: "Форма на сайте" },
    { id: 3, parentName: "Ольга Семенова", phone: "+7 (915) 333-55-66", childName: "Кирилл", childAge: 7, course: "Робототехника LEGO", status: "contacted", date: "19.06.2026", source: "Форма на сайте" },
    { id: 4, parentName: "Дмитрий Кузнецов", phone: "+7 (910) 777-88-99", childName: "Максим", childAge: 12, course: "Разработка на Python", status: "trial_scheduled", date: "18.06.2026", source: "Звонок" },
    { id: 5, parentName: "Елена Смирнова", phone: "+7 (903) 111-22-33", childName: "Даша", childAge: 9, course: "Программирование Scratch", status: "converted", date: "17.06.2026", source: "ВКонтакте" },
    { id: 6, parentName: "Алексей Иванов", phone: "+7 (980) 444-55-66", childName: "Артем", childAge: 11, course: "Разработка на Python", status: "lost", date: "15.06.2026", source: "Звонок" }
  ];

  const [leads, setLeads] = useState<Lead[]>([]);
  const [objections, setObjections] = useState<Objection[]>([]);
  
  // Drawer state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(false);

  // New Interaction Form
  const [intType, setIntType] = useState("call");
  const [intResult, setIntResult] = useState("answered");
  const [intSummary, setIntSummary] = useState("");
  const [intNextActionAt, setIntNextActionAt] = useState("");
  const [selectedObjectionId, setSelectedObjectionId] = useState("");
  const [savingInteraction, setSavingInteraction] = useState(false);

  // Manual Creation Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newParentName, setNewParentName] = useState("");
  const [newParentPhone, setNewParentPhone] = useState("");
  const [newChildName, setNewChildName] = useState("");
  const [newChildAge, setNewChildAge] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [newSource, setNewSource] = useState("manual");

  // Conversion State
  const [courses, setCourses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState<Lead | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState("");

  const [convertingLeadId, setConvertingLeadId] = useState<string | number | null>(null);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | number | null>(null);
  const [creatingLead, setCreatingLead] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function loadData() {
    try {
      setLoading(true);
      // Get org
      const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
      if (!orgRes.data) throw new Error("Organization not found");
      setOrgId(orgRes.data.id);

      // Fetch objections
      const { data: objectionsData } = await (supabase
        .from("objections") as any)
        .select("*")
        .eq("organization_id", orgRes.data.id)
        .eq("is_active", true);
      setObjections(objectionsData || []);

      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, title");
      if (coursesData) setCourses(coursesData);

      const courseMap = new Map();
      coursesData?.forEach((c: any) => courseMap.set(c.id, c.title));

      // Fetch active groups for enrollment select dropdown
      const { data: groupsData } = await supabase
        .from("groups")
        .select("id, title, status")
        .eq("status", "active");
      if (groupsData) setGroups(groupsData);

      const { data: leadsData, error } = await (supabase
        .from("leads") as any)
        .select("*")
        .eq("organization_id", orgRes.data.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      if (isDemoMode) {
        setLeads(initialLeads);
      } else {
        if (leadsData && leadsData.length > 0) {
          const formatted = leadsData.map((l: any) => ({
            id: l.id,
            parentName: l.parent_name,
            phone: l.parent_phone,
            childName: l.child_name || "",
            childAge: l.child_age || null,
            course: l.course_id ? (courseMap.get(l.course_id) || "Робототехника") : "Не выбран",
            courseId: l.course_id,
            status: l.status,
            date: new Date(l.created_at).toLocaleDateString("ru-RU"),
            source: l.source === "site_form" ? "Форма на сайте" : (l.source === "manual" ? "Вручную" : (l.source || "Другое")),
            convertedStudentId: l.converted_student_id,
            convertedGuardianId: l.converted_guardian_id
          }));
          setLeads(formatted);
        } else {
          setLeads([]);
        }
      }
    } catch (err) {
      console.error("Error loading leads:", err);
      setLeads(initialLeads);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Fetch interactions when a lead is selected
  useEffect(() => {
    if (!selectedLead || typeof selectedLead.id !== "string") {
      setInteractions([]);
      return;
    }

    const leadId = selectedLead.id;

    async function loadInteractions() {
      try {
        setLoadingInteractions(true);
        const { data, error } = await (supabase
          .from("lead_interactions") as any)
          .select(`
            id,
            type,
            result,
            summary,
            next_action_at,
            created_at,
            profiles (full_name)
          `)
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setInteractions(data || []);
      } catch (err) {
        console.error("Error loading interactions:", err);
      } finally {
        setLoadingInteractions(false);
      }
    }

    loadInteractions();
  }, [selectedLead]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new": return <span className="badge badge-blue">Новая</span>;
      case "contacted": return <span className="badge badge-amber">Связались</span>;
      case "trial_scheduled": return <span className="badge badge-purple">Пробное</span>;
      case "converted": return <span className="badge badge-green">Ученик</span>;
      case "lost": return <span className="badge badge-red">Потеряна</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  const handleUpdateStatus = async (id: any, newStatus: "new" | "contacted" | "trial_scheduled" | "converted" | "lost") => {
    if (updatingLeadId === id || convertingLeadId === id) return;
    try {
      setUpdatingLeadId(id);
      if (typeof id === "string") {
        const { error } = await (supabase
          .from("leads") as any)
          .update({ status: newStatus })
          .eq("id", id);

        if (error) throw error;
      }
      setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead));
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error("Error updating lead status:", err);
      alert("Не удалось обновить статус заявки");
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleConvertLead = (lead: Lead) => {
    setLeadToConvert(lead);
    setSelectedGroupId("");
    setShowConvertModal(true);
  };

  const handleConvertLeadConfirm = async () => {
    if (!leadToConvert) return;
    const leadId = leadToConvert.id;
    if (convertingLeadId === leadId) return;

    try {
      setConvertingLeadId(leadId);
      if (typeof leadId === "number") {
        setLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, status: "converted" } : lead));
        alert("Демонстрационный лид зачислен! (Данные обновлены локально)");
        setShowConvertModal(false);
        setLeadToConvert(null);
        return;
      }

      const res = await fetch("/api/crm/leads/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          leadId, 
          groupId: selectedGroupId || undefined 
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Не удалось зачислить ученика");
      }

      alert(`Ученик успешно зачислен!\nСоздан логин для родителя: ${data.parentEmail || "уже существует"}\nПароль: demo`);
      
      setLeads(prev => prev.map(lead => 
        lead.id === leadId 
          ? { 
              ...lead, 
              status: "converted", 
              convertedStudentId: data.studentId, 
              convertedGuardianId: data.guardianId 
            } 
          : lead
      ));
      
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => prev ? { 
          ...prev, 
          status: "converted", 
          convertedStudentId: data.studentId, 
          convertedGuardianId: data.guardianId 
        } : null);
      }
      
      setShowConvertModal(false);
      setLeadToConvert(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Ошибка зачисления");
    } finally {
      setConvertingLeadId(null);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingLead) return;
    try {
      setCreatingLead(true);
      const insertData = {
        organization_id: orgId,
        status: "new",
        source: newSource,
        parent_name: newParentName,
        parent_phone: newParentPhone,
        child_name: newChildName || null,
        child_age: newChildAge ? parseInt(newChildAge, 10) : null,
        course_id: newCourseId || null,
      };

      const { data, error } = await (supabase.from("leads") as any).insert(insertData).select().single();
      if (error) throw error;

      const selCourse = courses.find(c => c.id === newCourseId);
      const newLeadObj: Lead = {
        id: data.id,
        parentName: data.parent_name,
        phone: data.parent_phone,
        childName: data.child_name || "",
        childAge: data.child_age,
        course: selCourse ? selCourse.title : "Не выбран",
        courseId: data.course_id,
        status: data.status,
        date: new Date(data.created_at).toLocaleDateString("ru-RU"),
        source: data.source === "site_form" ? "Форма на сайте" : "Вручную"
      };

      setLeads([newLeadObj, ...leads]);
      setShowAddModal(false);
      // Reset form
      setNewParentName("");
      setNewParentPhone("");
      setNewChildName("");
      setNewChildAge("");
      setNewCourseId("");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось создать лид: " + err.message);
    } finally {
      setCreatingLead(false);
    }
  };

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    if (typeof selectedLead.id === "number") {
      alert("Функция фиксации касаний доступна только для реальных лидов из БД.");
      return;
    }

    try {
      setSavingInteraction(true);
      
      const insertData = {
        organization_id: orgId,
        lead_id: selectedLead.id,
        type: intType,
        result: intResult,
        summary: intSummary,
        next_action_at: intNextActionAt ? new Date(intNextActionAt).toISOString() : null
      };

      const { data, error } = await (supabase
        .from("lead_interactions") as any)
        .insert(insertData)
        .select(`
          id,
          type,
          result,
          summary,
          next_action_at,
          created_at,
          profiles (full_name)
        `)
        .single();

      if (error) throw error;

      setInteractions(prev => [data, ...prev]);
      setIntSummary("");
      setIntNextActionAt("");
      setSelectedObjectionId("");

      // Automatically update lead status based on result
      let targetStatus: Lead["status"] | "" = "";
      if (intResult === "scheduled_trial") {
        targetStatus = "trial_scheduled";
      } else if (intResult === "rejected") {
        targetStatus = "lost";
      } else if (intResult === "interested" || intResult === "thinking" || intResult === "answered") {
        targetStatus = "contacted";
      } else if (intResult === "paid") {
        // Convert to student
        setShowConvertModal(true);
        setLeadToConvert(selectedLead);
        return;
      }

      if (targetStatus && targetStatus !== selectedLead.status) {
        await handleUpdateStatus(selectedLead.id, targetStatus);
      }

      alert("Касание зафиксировано!");
    } catch (err) {
      console.error("Error adding interaction:", err);
      alert("Ошибка при сохранении касания");
    } finally {
      setSavingInteraction(false);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesTab = activeTab === "all" || lead.status === activeTab;
    const matchesSearch = 
      lead.parentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (lead.childName && lead.childName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      lead.phone.includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  const getInteractionTypeLabel = (t: string) => {
    switch (t) {
      case "call": return "📞 Звонок";
      case "message": return "💬 Сообщение";
      case "meeting": return "🤝 Встреча";
      case "comment": return "📝 Заметка";
      default: return t;
    }
  };

  const getInteractionResultLabel = (r: string | null) => {
    if (!r) return "";
    switch (r) {
      case "answered": return "Ответил";
      case "no_answer": return "Не ответил";
      case "interested": return "Проявил интерес";
      case "scheduled_trial": return "Записан на пробное";
      case "thinking": return "Думает";
      case "rejected": return "Отказ";
      case "paid": return "Оплатил";
      default: return r;
    }
  };

  const selectedObjection = objections.find(o => o.id === selectedObjectionId);

  return (
    <div style={{ display: "flex", gap: "32px", position: "relative" }}>
      {/* Leads Table Section */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "32px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
              Заявки и Лиды
            </h1>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
              Всего заявок в системе: {leads.length}
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} variant="primary-crm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Plus size={16} />
            <span>Добавить вручную</span>
          </Button>
        </div>

        {/* Tabs / Filters */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: "12px",
          gap: "24px"
        }}>
          {/* Status filters */}
          <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
            {[
              { id: "all", label: "Все" },
              { id: "new", label: "Новые" },
              { id: "contacted", label: "В работе" },
              { id: "trial_scheduled", label: "Пробные" },
              { id: "converted", label: "Ученики" },
              { id: "lost", label: "Потерянные" }
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
                  background: activeTab === tab.id ? "var(--color-primary)" : "transparent",
                  color: activeTab === tab.id ? "white" : "var(--color-text-muted)",
                  transition: "all 0.2s"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search input */}
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
              placeholder="Поиск по имени, тел..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="card-crm" style={{ padding: 0, overflow: "hidden", background: "white" }}>
          {filteredLeads.length === 0 ? (
            <div style={{ padding: "64px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <Inbox size={48} style={{ color: "var(--color-text-muted)", opacity: 0.5 }} />
              <div>
                <h4 style={{ fontWeight: 700, fontSize: "1.1rem" }}>Заявок не найдено</h4>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Попробуйте изменить параметры фильтрации.</p>
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
                  <th style={{ padding: "0 24px" }}>Родитель</th>
                  <th>Телефон</th>
                  <th>Ребенок</th>
                  <th>Курс</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th>Источник</th>
                  <th style={{ padding: "0 24px", textAlign: "right" }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} style={{
                    borderBottom: "1px solid var(--color-border)",
                    height: "64px",
                    background: selectedLead && selectedLead.id === lead.id ? "var(--color-primary-soft)" : "transparent",
                    transition: "background 0.2s"
                  }} className="table-row">
                    <td style={{ padding: "0 24px", fontWeight: 700 }}>{lead.parentName}</td>
                    <td>{lead.phone}</td>
                    <td>{lead.childName ? `${lead.childName} (${lead.childAge} лет)` : "—"}</td>
                    <td>{lead.course}</td>
                    <td>{getStatusBadge(lead.status)}</td>
                    <td>{lead.date}</td>
                    <td style={{ color: "var(--color-text-muted)" }}>{lead.source}</td>
                    <td style={{ padding: "0 24px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" }}>
                        <button 
                          onClick={() => setSelectedLead(lead)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--color-border)",
                            background: "white",
                            color: "var(--color-text)",
                            fontWeight: 700,
                            fontSize: "12px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <MessageSquare size={12} />
                          Касание
                        </button>

                        {lead.status === "converted" && lead.convertedStudentId ? (
                          <Link
                            href={`/crm/students/${lead.convertedStudentId}`}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "6px",
                              background: "var(--color-primary-soft)",
                              color: "var(--color-primary-dark)",
                              fontWeight: 700,
                              fontSize: "12px",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              border: "1px solid transparent"
                            }}
                          >
                            Открыть ученика
                          </Link>
                        ) : (
                          <>
                            {lead.status === "new" && (
                              <button
                                onClick={() => handleUpdateStatus(lead.id, "contacted")}
                                disabled={updatingLeadId === lead.id || convertingLeadId === lead.id}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--color-border)",
                                  background: "#f8fafc",
                                  color: "var(--color-text)",
                                  fontWeight: 700,
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  opacity: (updatingLeadId === lead.id || convertingLeadId === lead.id) ? 0.6 : 1
                                }}
                              >
                                Позвонить
                              </button>
                            )}
                            {(lead.status === "new" || lead.status === "contacted") && (
                              <button
                                onClick={() => handleUpdateStatus(lead.id, "trial_scheduled")}
                                disabled={updatingLeadId === lead.id || convertingLeadId === lead.id}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--color-border)",
                                  background: "#f5f3ff",
                                  color: "#6d28d9",
                                  fontWeight: 700,
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  opacity: (updatingLeadId === lead.id || convertingLeadId === lead.id) ? 0.6 : 1
                                }}
                              >
                                Пробное
                              </button>
                            )}
                            {lead.status !== "converted" && (
                              <button
                                onClick={() => handleConvertLead(lead)}
                                disabled={updatingLeadId === lead.id || convertingLeadId === lead.id}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  background: "var(--color-primary)",
                                  color: "white",
                                  fontWeight: 700,
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  border: "none",
                                  opacity: (updatingLeadId === lead.id || convertingLeadId === lead.id) ? 0.6 : 1
                                }}
                              >
                                {convertingLeadId === lead.id ? "Зачисление..." : "Зачислить"}
                              </button>
                            )}
                            {lead.status !== "lost" && (
                              <button
                                onClick={() => handleUpdateStatus(lead.id, "lost")}
                                disabled={updatingLeadId === lead.id || convertingLeadId === lead.id}
                                style={{
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  border: "none",
                                  background: "transparent",
                                  color: "#94a3b8",
                                  fontWeight: 500,
                                  fontSize: "12px",
                                  cursor: "pointer",
                                  opacity: (updatingLeadId === lead.id || convertingLeadId === lead.id) ? 0.6 : 1
                                }}
                              >
                                Отклонить
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Interaction History Drawer (Opens on click) */}
      {selectedLead && (
        <aside style={{
          width: "420px",
          background: "white",
          borderLeft: "1px solid var(--color-border)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          minHeight: "calc(100vh - 128px)",
          position: "sticky",
          top: "80px",
          alignSelf: "flex-start",
          boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.02)",
          borderRadius: "14px",
          zIndex: 10
        }}>
          {/* Drawer Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--color-border)", paddingBottom: "16px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 700, fontSize: "16px" }}>Касание: {selectedLead.parentName}</span>
                {getStatusBadge(selectedLead.status)}
              </div>
              <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                Тел: {selectedLead.phone} · Ребенок: {selectedLead.childName || "—"}
              </span>
            </div>
            <button 
              onClick={() => setSelectedLead(null)}
              style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: "4px" }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form to Log New Touchpoint */}
          <form onSubmit={handleAddInteraction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
              Зафиксировать касание:
            </span>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Тип связи</label>
                <select className="form-input" style={{ height: "36px", padding: "0 8px", fontSize: "12px" }} value={intType} onChange={e => setIntType(e.target.value)}>
                  <option value="call">📞 Звонок</option>
                  <option value="message">💬 Сообщение</option>
                  <option value="meeting">🤝 Встреча</option>
                  <option value="comment">📝 Комментарий</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Результат</label>
                <select className="form-input" style={{ height: "36px", padding: "0 8px", fontSize: "12px" }} value={intResult} onChange={e => setIntResult(e.target.value)}>
                  <option value="answered">Ответил</option>
                  <option value="no_answer">Не ответил</option>
                  <option value="interested">Проявил интерес</option>
                  <option value="scheduled_trial">Записан на пробное</option>
                  <option value="thinking">Думает</option>
                  <option value="rejected">Отказ</option>
                  <option value="paid">Купил абонемент</option>
                </select>
              </div>
            </div>

            {/* Objection helper lookup */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Возражение (подсказка куратору)</label>
              <select 
                className="form-input" 
                style={{ height: "36px", padding: "0 8px", fontSize: "12px" }} 
                value={selectedObjectionId} 
                onChange={e => setSelectedObjectionId(e.target.value)}
              >
                <option value="">-- Клиент сомневается / возражает --</option>
                {objections.map(o => (
                  <option key={o.id} value={o.id}>{o.title} ({o.category})</option>
                ))}
              </select>
            </div>

            {/* Objection cheat sheet content */}
            {selectedObjection && (
              <div style={{ background: "#F0FDF4", border: "1px solid #DCFCE7", borderRadius: "8px", padding: "12px", fontSize: "11px", color: "#166534" }}>
                <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                  <HelpCircle size={12} />
                  <span>Скрипт преодоления сомнения:</span>
                </div>
                <p style={{ fontStyle: "italic" }}>{selectedObjection.recommended_answer}</p>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Краткий итог беседы</label>
              <textarea 
                className="form-input" 
                style={{ height: "70px", padding: "8px 12px", fontSize: "12px", resize: "none" }}
                placeholder="О чем договорились..."
                value={intSummary}
                onChange={e => setIntSummary(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Дата следующего контакта</label>
              <input 
                type="date" 
                className="form-input" 
                style={{ height: "36px", padding: "0 8px", fontSize: "12px" }}
                value={intNextActionAt}
                onChange={e => setIntNextActionAt(e.target.value)}
              />
            </div>

            <Button 
              type="submit" 
              variant="primary-crm"
              style={{ width: "100%", height: "36px", fontSize: "12px" }}
              disabled={savingInteraction}
            >
              {savingInteraction ? "Сохранение..." : "Сохранить касание"}
            </Button>
          </form>

          {/* Past Interactions Feed */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
            <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
              История контактов:
            </span>

            {loadingInteractions ? (
              <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>Загрузка истории...</span>
            ) : interactions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {interactions.map(item => {
                  const itemDate = new Date(item.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
                  const nextDate = item.next_action_at ? new Date(item.next_action_at).toLocaleDateString("ru-RU") : null;

                  return (
                    <div 
                      key={item.id}
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        fontSize: "12px",
                        background: "var(--color-bg)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "11px", marginBottom: "4px" }}>
                        <span>{getInteractionTypeLabel(item.type)}</span>
                        <span style={{ color: "var(--color-primary-dark)" }}>{getInteractionResultLabel(item.result)}</span>
                      </div>
                      <p style={{ color: "var(--color-text)", fontSize: "12px" }}>{item.summary}</p>
                      
                      {nextDate && (
                        <div style={{ fontSize: "10px", color: "var(--color-warning-dark)", marginTop: "6px", display: "flex", alignItems: "center", gap: "2px", fontWeight: 600 }}>
                          <Clock size={10} />
                          <span>След. контакт: {nextDate}</span>
                        </div>
                      )}

                      <div style={{ fontSize: "9px", color: "var(--color-text-muted)", marginTop: "4px", textAlign: "right" }}>
                        {itemDate} · {item.profiles ? item.profiles.full_name : "Менеджер"}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                С клиентом еще не связывались.
              </span>
            )}
          </div>
        </aside>
      )}
      {/* Add Lead Modal */}
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
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "4px" }}>Добавить лид вручную</h3>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Создание новой карточки потенциального клиента</p>
            </div>

            <form onSubmit={handleCreateLead} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Имя родителя *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Анна Петрова" 
                  required 
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                />
              </div>

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

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Имя ребенка</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Игорь" 
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Возраст</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="8" 
                    value={newChildAge}
                    onChange={(e) => setNewChildAge(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Интересующий курс</label>
                <select 
                  className="form-input" 
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                >
                  <option value="">Не выбран</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
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

      {/* Convert Lead Modal */}
      {showConvertModal && leadToConvert && (
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
            maxWidth: "420px",
            padding: "32px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "24px"
          }}>
            <div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "4px" }}>Зачислить ученика</h3>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                Конвертация лида: {leadToConvert.childName || leadToConvert.parentName}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "var(--color-bg)", padding: "16px", borderRadius: "8px", fontSize: "var(--font-small)", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div><strong>Родитель:</strong> {leadToConvert.parentName}</div>
                <div><strong>Телефон:</strong> {leadToConvert.phone}</div>
                <div><strong>Ребенок:</strong> {leadToConvert.childName ? `${leadToConvert.childName} (${leadToConvert.childAge || "—"} лет)` : "Не указан"}</div>
                <div><strong>Курс:</strong> {leadToConvert.course}</div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Выберите учебную группу</label>
                <select 
                  className="form-input" 
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  <option value="">Не зачислять в группу (только создать карточки)</option>
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
                  onClick={() => {
                    setShowConvertModal(false);
                    setLeadToConvert(null);
                  }}
                >
                  Отмена
                </Button>
                <Button 
                  type="button" 
                  variant="primary-crm" 
                  style={{ flex: 1 }}
                  onClick={handleConvertLeadConfirm}
                  disabled={convertingLeadId === leadToConvert.id}
                >
                  {convertingLeadId === leadToConvert.id ? "Зачисление..." : "Зачислить"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
