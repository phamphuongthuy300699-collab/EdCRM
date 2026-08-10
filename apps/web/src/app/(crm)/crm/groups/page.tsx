"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { GraduationCap, Plus, Search, Users, Calendar, Clock, Sparkles } from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { isDemoMode } from "@/shared/utils/demo";
import { useActionConfirmation } from "@/shared/ui/useActionConfirmation";
import { StudentPicker } from "@/shared/ui/StudentPicker";
import { CrmDialog } from "@/shared/ui/CrmDialog";

const weekdaysRu = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function formatScheduleRules(rules: any[]) {
  if (!rules || rules.length === 0) return "Не задано";
  const sorted = [...rules].sort((a, b) => {
    if (a.weekday !== b.weekday) return a.weekday - b.weekday;
    return a.starts_at.localeCompare(b.starts_at);
  });
  
  const timeGroups: Record<string, number[]> = {};
  sorted.forEach(r => {
    const time = r.starts_at.slice(0, 5);
    if (!timeGroups[time]) timeGroups[time] = [];
    timeGroups[time].push(r.weekday);
  });

  return Object.entries(timeGroups)
    .map(([time, days]) => {
      const daysStr = days.map(d => weekdaysRu[d - 1]).join(" / ");
      return `${daysStr} ${time}`;
    })
    .join(", ");
}

function parseSchedule(scheduleText: string): { weekday: number; starts_at: string; ends_at: string }[] {
  const timeMatch = scheduleText.match(/(\d{2}):(\d{2})/);
  const time = timeMatch ? timeMatch[0] : "18:00";
  const starts_at = `${time}:00`;
  const [h, m] = time.split(":").map(Number);
  const endH = String((h + 1) % 24).padStart(2, '0');
  const ends_at = `${endH}:${String(m).padStart(2, '0')}:00`;

  const dayNames = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
  const rules: { weekday: number; starts_at: string; ends_at: string }[] = [];
  
  const textLower = scheduleText.toLowerCase();
  dayNames.forEach((day, index) => {
    if (textLower.includes(day)) {
      rules.push({
        weekday: index + 1,
        starts_at,
        ends_at
      });
    }
  });

  if (rules.length === 0) {
    rules.push({
      weekday: 1,
      starts_at,
      ends_at
    });
  }

  return rules;
}

export default function CrmGroupsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [actionError, setActionError] = useState("");
  const [groupActionId, setGroupActionId] = useState<string | null>(null);
  const { askAction, modal: actionModal } = useActionConfirmation();

  // Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCourseId, setNewCourseId] = useState("");
  const [newSchedule, setNewSchedule] = useState("");
  const [newTeacherId, setNewTeacherId] = useState("");
  const [newCapacity, setNewCapacity] = useState("8");
  const [newAgeFrom, setNewAgeFrom] = useState("6");
  const [newAgeTo, setNewAgeTo] = useState("9");

  // Edit Group Form State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCourseId, setEditCourseId] = useState("");
  const [editSchedule, setEditSchedule] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editCapacity, setEditCapacity] = useState("8");
  const [editAgeFrom, setEditAgeFrom] = useState("6");
  const [editAgeTo, setEditAgeTo] = useState("9");
  const [editBillingEnabled, setEditBillingEnabled] = useState(false);
  const [editLessonPrice, setEditLessonPrice] = useState("");
  const [editChargeExcused, setEditChargeExcused] = useState(false);
  const [editChargeUnexcused, setEditChargeUnexcused] = useState(true);
  const [savingGroup, setSavingGroup] = useState(false);
  const [rebuildFutureSessions, setRebuildFutureSessions] = useState(true);

  // Enrollment fields
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentToAddId, setStudentToAddId] = useState("");
  const [addingStudentToGroup, setAddingStudentToGroup] = useState(false);

  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  const initialGroups = [
    { id: "g1", title: "LEGO Start 1", courseName: "Робототехника (Lego Education)", schedule: "Вт / Чт 17:00", teacherName: "Алексей Дмитриев", ageRange: "6–8 лет", capacity: 8, enrolled: 7, status: "active" },
    { id: "g2", title: "LEGO Start 2", courseName: "Робототехника (Lego Education)", schedule: "Пн / Ср 15:30", teacherName: "Алексей Дмитриев", ageRange: "6–8 лет", capacity: 8, enrolled: 4, status: "active" },
    { id: "g3", title: "Scratch Basic", courseName: "Программирование на Scratch", schedule: "Сб 11:00", teacherName: "Мария Соколова", ageRange: "8–11 лет", capacity: 8, enrolled: 8, status: "active" },
    { id: "g4", title: "Python Junior", courseName: "Программирование на Python", schedule: "Пт 18:00", teacherName: "Егор Смирнов", ageRange: "11–14 лет", capacity: 10, enrolled: 5, status: "active" }
  ];

  const [groups, setGroups] = useState<any[]>([]);
  
  // Drawer state
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [groupStudents, setGroupStudents] = useState<any[]>([]);
  const [loadingGroupStudents, setLoadingGroupStudents] = useState(false);

  const supabase = createSupabaseBrowserClient();

  const handleOpenGroupDrawer = async (group: any) => {
    setSelectedGroup(group);
    setGroupStudents([]);
    
    if (typeof group.id === "number" || (typeof group.id === "string" && group.id.startsWith("g"))) {
      setGroupStudents([
        { id: "s1", full_name: "Игорь Петров" },
        { id: "s2", full_name: "Данил Соловьев" }
      ]);
      return;
    }

    try {
      setLoadingGroupStudents(true);
      const { data: enrolls } = await supabase
        .from("enrollments")
        .select(`
          student_id,
          students (id, full_name, birth_date)
        `)
        .eq("group_id", group.id)
        .eq("status", "active");

      const list = enrolls?.map((e: any) => e.students).filter(Boolean) || [];
      setGroupStudents(list);
    } catch (err) {
      console.error("Error loading group students:", err);
    } finally {
      setLoadingGroupStudents(false);
    }
  };

  async function loadData() {
    try {
      setLoading(true);

      // Fetch courses for selection
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, title");
      if (coursesData) setCourses(coursesData);

      // Fetch teachers for selection
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name");
      if (profilesData) setTeachers(profilesData);

      // Fetch all active students
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, full_name, birth_date")
        .eq("status", "active")
        .order("full_name");
      if (studentsData) setAllStudents(studentsData);

      // Fetch groups
      const { data: groupsData, error } = await supabase
        .from("groups")
        .select(`
          id,
          title,
          course_id,
          teacher_id,
          capacity,
          age_from,
          age_to,
          status,
          show_on_site,
          archived_at,
          billing_enabled,
          lesson_price,
          charge_absent_excused,
          charge_absent_unexcused,
          courses (title),
          profiles (full_name),
          group_schedule_rules (weekday, starts_at, ends_at)
        `);

      if (error) throw error;

      // Fetch enrollments to calculate enrolled count
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("group_id, status")
        .eq("status", "active");

      const enrollCountMap = new Map();
      (enrollments as any[])?.forEach(e => {
        enrollCountMap.set(e.group_id, (enrollCountMap.get(e.group_id) || 0) + 1);
      });

      const demo = isDemoMode();

      if (demo) {
        setGroups(initialGroups);
      } else {
        if (groupsData && groupsData.length > 0) {
          const formatted = groupsData.map((g: any) => ({
            id: g.id,
            title: g.title,
            courseName: g.courses?.title || "Не указан",
            courseId: g.course_id,
            teacherId: g.teacher_id,
            schedule: formatScheduleRules(g.group_schedule_rules),
            teacherName: g.profiles?.full_name || "Не назначен",
            ageRange: `${g.age_from || 6}–${g.age_to || 14} лет`,
            ageFrom: g.age_from || 6,
            ageTo: g.age_to || 14,
            capacity: g.capacity || 8,
            enrolled: enrollCountMap.get(g.id) || 0,
            status: g.status
            ,
            showOnSite: g.show_on_site,
            archivedAt: g.archived_at,
            billingEnabled: g.billing_enabled,
            lessonPrice: g.lesson_price,
            chargeAbsentExcused: g.charge_absent_excused,
            chargeAbsentUnexcused: g.charge_absent_unexcused
          }));
          setGroups(formatted);
        } else {
          setGroups([]);
        }
      }
    } catch (err) {
      console.error("Error loading group list:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && groups.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const openId = params.get("open");
      if (openId) {
        const found = groups.find(g => g.id === openId);
        if (found) {
          handleOpenGroupDrawer(found);
        }
      }
    }
  }, [groups]);

  const getCapacityBar = (enrolled: number, capacity: number) => {
    const percentage = Math.min(100, Math.round((enrolled / capacity) * 100));
    const blocksCount = 8;
    const filledBlocks = Math.round((enrolled / capacity) * blocksCount);
    
    let blocksStr = "";
    for (let i = 0; i < blocksCount; i++) {
      if (i < filledBlocks) {
        blocksStr += "█";
      } else {
        blocksStr += "░";
      }
    }

    const isFull = enrolled >= capacity;
    const isAlmostFull = enrolled === capacity - 1;
    
    let color = "var(--color-text-muted)";
    if (isFull) color = "var(--color-danger)";
    else if (isAlmostFull) color = "var(--color-warning-dark)";
    else if (enrolled > 0) color = "var(--color-success)";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <div style={{ fontFamily: "monospace", letterSpacing: "1px", fontSize: "14px", color }}>
          {blocksStr} <span style={{ fontWeight: 700, fontSize: "12px", marginLeft: "4px" }}>{enrolled}/{capacity} мест</span>
        </div>
        <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
          {isFull ? "Мест нет" : isAlmostFull ? "Осталось 1 место" : `Свободно: ${capacity - enrolled}`}
        </span>
      </div>
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingGroup) return;
    try {
      setSavingGroup(true);
      const rules = parseSchedule(newSchedule);
      if (isDemoMode()) {
        const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
        if (!orgRes.data) throw new Error("Org not found");
        const { data, error } = await (supabase.from("groups") as any).insert({
          organization_id: orgRes.data.id,
          title: newTitle,
          course_id: newCourseId,
          teacher_id: newTeacherId || null,
          capacity: parseInt(newCapacity, 10),
          age_from: parseInt(newAgeFrom, 10),
          age_to: parseInt(newAgeTo, 10),
          status: "active" as const,
        }).select("id, title, capacity, age_from, age_to, status, courses (title), profiles (full_name)").single();
        if (error) throw error;
        setGroups([{
          id: data.id,
          title: data.title,
          courseName: data.courses?.title || "Не указан",
          schedule: formatScheduleRules(rules),
          teacherName: data.profiles?.full_name || "Не назначен",
          ageRange: `${data.age_from}–${data.age_to} лет`,
          capacity: data.capacity,
          enrolled: 0,
          status: data.status,
        }, ...groups]);
      } else {
        const response = await fetch("/api/crm/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_group",
            group: { title: newTitle, courseId: newCourseId, teacherId: newTeacherId || null, capacity: parseInt(newCapacity, 10), ageFrom: parseInt(newAgeFrom, 10), ageTo: parseInt(newAgeTo, 10), status: "active" },
            rules,
            rebuildFuture: rebuildFutureSessions,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось сохранить группу и расписание");
        await loadData();
      }
      setShowAddModal(false);
      
      // Reset form
      setNewTitle("");
      setNewCourseId("");
      setNewSchedule("");
      setNewTeacherId("");
      setNewCapacity("8");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось создать группу: " + err.message);
    } finally {
      setSavingGroup(false);
    }
  };

  const handleOpenEditModal = (group: any) => {
    setEditingGroupId(group.id);
    setEditTitle(group.title);
    setEditCourseId(group.courseId || "");
    setEditSchedule(group.schedule);
    setEditTeacherId(group.teacherId || "");
    setEditCapacity(String(group.capacity));
    setEditAgeFrom(String(group.ageFrom));
    setEditAgeTo(String(group.ageTo));
    setEditBillingEnabled(Boolean(group.billingEnabled));
    setEditLessonPrice(group.lessonPrice == null ? "" : String(group.lessonPrice));
    setEditChargeExcused(Boolean(group.chargeAbsentExcused));
    setEditChargeUnexcused(group.chargeAbsentUnexcused !== false);
    setShowEditModal(true);
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingGroup) return;
    try {
      setSavingGroup(true);
      const demo = isDemoMode();
      const isMockId = typeof editingGroupId === "string" && editingGroupId.startsWith("g");

      const rules = parseSchedule(editSchedule);
      const selCourse = courses.find(c => c.id === editCourseId);
      const selTeacher = teachers.find(t => t.id === editTeacherId);

      if (demo || isMockId) {
        setGroups(prev => prev.map(g => g.id === editingGroupId ? {
          ...g,
          title: editTitle,
          courseName: selCourse ? selCourse.title : "Не указан",
          courseId: editCourseId,
          teacherId: editTeacherId,
          schedule: formatScheduleRules(rules),
          teacherName: selTeacher ? selTeacher.full_name : "Не назначен",
          ageRange: `${editAgeFrom}–${editAgeTo} лет`,
          ageFrom: parseInt(editAgeFrom, 10),
          ageTo: parseInt(editAgeTo, 10),
          capacity: parseInt(editCapacity, 10)
        } : g));
        setShowEditModal(false);
        alert("Группа обновлена (Демо-режим)!");
        return;
      }

      const response = await fetch("/api/crm/schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        action: "save_group",
        groupId: editingGroupId,
        group: { title: editTitle, courseId: editCourseId, teacherId: editTeacherId || null, capacity: parseInt(editCapacity, 10), ageFrom: parseInt(editAgeFrom, 10), ageTo: parseInt(editAgeTo, 10), billingEnabled: editBillingEnabled, lessonPrice: editLessonPrice === "" ? null : Number(editLessonPrice), chargeAbsentExcused: editChargeExcused, chargeAbsentUnexcused: editChargeUnexcused },
        rules,
        rebuildFuture: rebuildFutureSessions,
      }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Не удалось сохранить группу и расписание");

      await loadData();
      setShowEditModal(false);
      alert("Группа успешно обновлена!");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось обновить группу: " + err.message);
    } finally {
      setSavingGroup(false);
    }
  };

  const handleAddStudent = async () => {
    if (!studentToAddId || addingStudentToGroup || !selectedGroup) return;
    try {
      setAddingStudentToGroup(true);
      const demo = isDemoMode();
      const isMockId = typeof selectedGroup.id === "string" && selectedGroup.id.startsWith("g");

      const studentObj = allStudents.find(s => s.id === studentToAddId);
      const alreadyEnrolled = groupStudents.some((student) => student.id === studentToAddId);
      if (alreadyEnrolled) {
        throw new Error("Ученик уже зачислен в эту группу");
      }

      const capacity = Number(selectedGroup.capacity || 0);
      const enrolledCount = Math.max(Number(selectedGroup.enrolled || 0), groupStudents.length);
      if (capacity > 0 && enrolledCount >= capacity) {
        throw new Error("В группе нет свободных мест");
      }

      if (demo || isMockId) {
        setGroupStudents(prev => [...prev, { id: studentToAddId, full_name: studentObj ? studentObj.full_name : "Новый ученик" }]);
        setStudentToAddId("");
        alert("Ученик зачислен в группу (Демо-режим)!");
        return;
      }

      const response = await fetch("/api/crm/students/enrollment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ studentId: studentToAddId, groupId: selectedGroup.id }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось зачислить ученика");

      // Reload drawer students and groups list
      await handleOpenGroupDrawer(selectedGroup);
      await loadData();
      setStudentToAddId("");
      alert("Ученик успешно зачислен!");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось зачислить ученика: " + err.message);
    } finally {
      setAddingStudentToGroup(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    const allowed = await askAction({
      title: "Исключить ученика из группы",
      description: "Активное зачисление будет закрыто, история ученика и группы останется в CRM.",
      dangerLevel: "warning",
      confirmText: "Исключить",
    });
    if (!allowed) return;

    try {
      const demo = isDemoMode();
      const isMockId = typeof selectedGroup.id === "string" && selectedGroup.id.startsWith("g");

      if (demo || isMockId) {
        setGroupStudents(prev => prev.filter(gs => gs.id !== studentId));
        alert("Ученик исключен (Демо-режим)!");
        return;
      }

      const response = await fetch("/api/crm/students/enrollment", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ studentId, groupId: null }) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось исключить ученика");

      // Reload drawer students and groups list
      await handleOpenGroupDrawer(selectedGroup);
      await loadData();
      alert("Ученик успешно исключен из группы.");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось исключить ученика: " + err.message);
    }
  };

  const handleGroupLifecycle = async (group: any, action: "archive" | "restore" | "delete") => {
    const isDelete = action === "delete";
    const allowed = await askAction({
      title: action === "archive" ? "Архивировать группу" : action === "restore" ? "Восстановить группу" : "Удалить группу",
      description: action === "archive"
        ? `Группа "${group.title}" будет скрыта из сайта и рабочих списков, но останется в истории.`
        : action === "restore"
          ? `Группа "${group.title}" вернется в рабочие списки.`
          : `Удаление доступно только для черновиков без учеников, занятий, счетов и домашних заданий. Для подтверждения введите УДАЛИТЬ.`,
      dangerLevel: isDelete ? "danger" : "warning",
      confirmText: action === "archive" ? "Архивировать" : action === "restore" ? "Восстановить" : "Удалить",
      requireTypedConfirmation: isDelete,
      expectedText: "УДАЛИТЬ",
    });
    if (!allowed) return;

    try {
      setGroupActionId(group.id);
      setActionError("");

      if (isDemoMode() || String(group.id).startsWith("g")) {
        if (action === "delete") setGroups(prev => prev.filter(item => item.id !== group.id));
        else setGroups(prev => prev.map(item => item.id === group.id ? { ...item, archivedAt: action === "archive" ? new Date().toISOString() : null, showOnSite: action !== "archive" } : item));
        return;
      }

      const response = await fetch(`/api/crm/entities/groups/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: group.id, expectedText: isDelete ? "УДАЛИТЬ" : undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось выполнить действие");
      await loadData();
      if (selectedGroup?.id === group.id) setSelectedGroup(null);
    } catch (err: any) {
      setActionError(err.message || "Не удалось выполнить действие");
    } finally {
      setGroupActionId(null);
    }
  };

  const filteredGroups = groups.filter(g => {
    if (!showArchive && g.archivedAt) return false;
    const query = searchQuery.toLowerCase();
    return g.title.toLowerCase().includes(query) ||
           g.courseName.toLowerCase().includes(query) ||
           g.teacherName.toLowerCase().includes(query);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
            Группы обучения
          </h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
            Активных групп в филиале: {groups.filter(group => !group.archivedAt).length}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} variant="primary-crm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Plus size={16} />
          <span>Создать группу</span>
        </Button>
      </div>

      {/* Search & Filters */}
      {actionError && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 700 }}>
          {actionError}
        </div>
      )}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid var(--color-border)",
        paddingBottom: "12px",
        gap: "24px"
      }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <span style={{ fontSize: "var(--font-small)", fontWeight: 700, color: "var(--color-primary)" }} className="badge badge-blue">
            Все курсы
          </span>
          <label style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)" }}>
            <input type="checkbox" checked={showArchive} onChange={(event) => setShowArchive(event.target.checked)} />
            Показать архив
          </label>
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
            style={{ height: "40px", borderRadius: "8px", paddingLeft: "36px", fontSize: "var(--font-small)" }}
            placeholder="Поиск по названию, учителю..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid Container */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "24px"
      }}>
        {filteredGroups.map((group) => (
          <div key={group.id} className="card-crm" style={{ display: "flex", flexDirection: "column", gap: "20px", background: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-text)", marginBottom: "4px" }}>
                  {group.title}
                </h3>
                <span className="badge badge-gray" style={{ fontSize: "11px" }}>{group.courseName}</span>
              </div>
              <span className={`badge ${group.archivedAt ? "badge-gray" : group.status === "active" ? "badge-green" : "badge-amber"}`}>
                {group.archivedAt ? "Архив" : group.status === "active" ? "Активна" : group.status === "closed" ? "Закрыта" : "Черновик"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "var(--font-small)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)", padding: "16px 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar size={16} style={{ color: "var(--color-primary)" }} />
                <div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Расписание</div>
                  <div style={{ fontWeight: 600 }}>{group.schedule}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={16} style={{ color: "var(--color-primary)" }} />
                <div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Возраст</div>
                  <div style={{ fontWeight: 600 }}>{group.ageRange}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={16} style={{ color: "var(--color-primary)" }} />
                <div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Преподаватель</div>
                  <div style={{ fontWeight: 600 }}>{group.teacherName}</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginBottom: "4px" }}>Заполненность</div>
                {getCapacityBar(group.enrolled, group.capacity)}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <Button onClick={() => handleOpenGroupDrawer(group)} variant="secondary-site" style={{ height: "36px", fontSize: "12px", borderRadius: "8px" }}>
                Список учеников
              </Button>
              <Button onClick={() => handleOpenEditModal(group)} variant="primary-crm" style={{ height: "36px", fontSize: "12px", borderRadius: "8px" }}>
                Редактировать
              </Button>
              <Button
                onClick={() => handleGroupLifecycle(group, group.archivedAt ? "restore" : "archive")}
                variant="secondary-crm"
                disabled={groupActionId === group.id}
                style={{ height: "36px", fontSize: "12px", borderRadius: "8px" }}
              >
                {group.archivedAt ? "Восстановить" : "Архивировать"}
              </Button>
              <Button
                onClick={() => handleGroupLifecycle(group, "delete")}
                variant="secondary-crm"
                disabled={groupActionId === group.id}
                style={{ height: "36px", fontSize: "12px", borderRadius: "8px", color: "#DC2626" }}
              >
                Удалить
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <CrmDialog title="Создать новую группу" description="Заполните параметры учебного класса" onClose={() => setShowAddModal(false)} width={520}>
            <form onSubmit={handleCreateGroup} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Название группы *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="LEGO Start 3" 
                  required 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Курс *</label>
                <select 
                  className="form-input" 
                  required 
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                >
                  <option value="">Выберите направление</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Расписание (дни и время) *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Сб / Вс 13:00" 
                  required 
                  value={newSchedule}
                  onChange={(e) => setNewSchedule(e.target.value)}
                />
                <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Это шаблон повторения. Конкретные занятия формируются в разделе «Расписание».</span>
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}>
                <input type="checkbox" checked={rebuildFutureSessions} onChange={(event) => setRebuildFutureSessions(event.target.checked)} />
                <span><strong>Пересчитать будущие занятия</strong><br />Сформировать безопасный план на 12 недель.</span>
              </label>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Преподаватель</label>
                <select 
                  className="form-input" 
                  value={newTeacherId}
                  onChange={(e) => setNewTeacherId(e.target.value)}
                >
                  <option value="">Не назначен</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Мест *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    required 
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Возраст от</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={newAgeFrom}
                    onChange={(e) => setNewAgeFrom(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">до</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={newAgeTo}
                    onChange={(e) => setNewAgeTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="crm-dialog-actions" style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
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
        </CrmDialog>
      )}
      {/* Details Drawer */}
      {selectedGroup && (
        <CrmDialog title={<span style={{ display: "flex", alignItems: "center", gap: 10 }}>{selectedGroup.title}<span className={`badge ${selectedGroup.archivedAt ? "badge-gray" : selectedGroup.status === "active" ? "badge-green" : "badge-amber"}`}>{selectedGroup.archivedAt ? "Архив" : selectedGroup.status === "active" ? "Активна" : selectedGroup.status === "closed" ? "Закрыта" : "Черновик"}</span></span>} description={`Курс: ${selectedGroup.courseName} · Преподаватель: ${selectedGroup.teacherName}`} onClose={() => setSelectedGroup(null)} width={520} variant="drawer">
          {/* Group Details / Students List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ background: "var(--color-bg)", padding: "16px", borderRadius: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Параметры группы</span>
              <div><strong>Расписание:</strong> {selectedGroup.schedule}</div>
              <div><strong>Возраст:</strong> {selectedGroup.ageRange}</div>
              <div><strong>Вместимость:</strong> {selectedGroup.capacity} мест</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Список учеников ({groupStudents.length})</h4>
              
              {loadingGroupStudents ? (
                <div style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>Загрузка списка учеников...</div>
              ) : groupStudents.length === 0 ? (
                <div style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>В группе пока нет учеников.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {groupStudents.map((student: any) => (
                    <div key={student.id} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px",
                      background: "var(--color-bg)",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)"
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>{student.full_name}</div>
                        {student.birth_date && (
                          <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                            Дата рождения: {new Date(student.birth_date).toLocaleDateString("ru-RU")}
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={() => handleRemoveStudent(student.id)} 
                        variant="secondary-site" 
                        style={{ height: "28px", padding: "0 8px", fontSize: "11px", color: "var(--color-danger)" }}
                      >
                        Исключить
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Student to Group Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid var(--color-border)", paddingTop: "16px", marginTop: "12px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 700, margin: 0 }}>Добавить ученика в группу</h4>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "8px" }}>
                <StudentPicker
                  value={studentToAddId}
                  onChange={(value) => setStudentToAddId(String(value))}
                  excludeStudentIds={groupStudents.map((student) => student.id)}
                  demoOptions={isDemoMode() ? allStudents.map((student) => ({ id: student.id, fullName: student.full_name, status: "active" as const, withoutGroup: true })) : undefined}
                />
                <Button 
                  onClick={handleAddStudent} 
                  disabled={!studentToAddId || addingStudentToGroup}
                  variant="primary-crm" 
                  style={{ minHeight: "44px", fontSize: "13px", whiteSpace: "nowrap" }}
                >
                  {addingStudentToGroup ? "..." : "Добавить"}
                </Button>
              </div>
            </div>
          </div>
        </CrmDialog>
      )}
      {actionModal}

      {/* Edit Modal */}
      {showEditModal && (
        <CrmDialog title="Редактировать группу" description="Обновление параметров учебного класса" onClose={() => setShowEditModal(false)} width={520}>
            <form onSubmit={handleUpdateGroup} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Название группы *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Курс *</label>
                <select 
                  className="form-input" 
                  required 
                  value={editCourseId}
                  onChange={(e) => setEditCourseId(e.target.value)}
                >
                  <option value="">Выберите направление</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Расписание (дни и время) *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
                />
                <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Переносы конкретных дат сохраняются и не перезаписываются.</span>
              </div>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}>
                <input type="checkbox" checked={rebuildFutureSessions} onChange={(event) => setRebuildFutureSessions(event.target.checked)} />
                <span><strong>Пересчитать будущие занятия</strong><br />Пересоздать на 12 недель только плановые занятия из правил.</span>
              </label>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Преподаватель</label>
                <select 
                  className="form-input" 
                  value={editTeacherId}
                  onChange={(e) => setEditTeacherId(e.target.value)}
                >
                  <option value="">Не назначен</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Мест *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    required 
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Возраст от</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editAgeFrom}
                    onChange={(e) => setEditAgeFrom(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">до</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={editAgeTo}
                    onChange={(e) => setEditAgeTo(e.target.value)}
                  />
                </div>
              </div>

              <fieldset style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 14, display: "grid", gap: 12 }}>
                <legend style={{ padding: "0 6px", fontWeight: 800 }}>Оплата занятий</legend>
                <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13 }}><input type="checkbox" checked={editBillingEnabled} onChange={(event) => setEditBillingEnabled(event.target.checked)} /><span><strong>Списывать с лицевого счёта</strong><br /><small style={{ color: "var(--color-text-muted)" }}>По умолчанию выключено. Пробные занятия бесплатны.</small></span></label>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Цена одного занятия, ₽</label><input type="number" min="0.01" step="0.01" className="form-input" value={editLessonPrice} onChange={(event) => setEditLessonPrice(event.target.value)} disabled={!editBillingEnabled} placeholder="Например, 750" /></div>
                <label style={{ display: "flex", gap: 8, fontSize: 13 }}><input type="checkbox" checked={editChargeExcused} onChange={(event) => setEditChargeExcused(event.target.checked)} disabled={!editBillingEnabled} /> Списывать за уважительный пропуск</label>
                <label style={{ display: "flex", gap: 8, fontSize: 13 }}><input type="checkbox" checked={editChargeUnexcused} onChange={(event) => setEditChargeUnexcused(event.target.checked)} disabled={!editBillingEnabled} /> Списывать за неуважительный пропуск</label>
              </fieldset>

              <div className="crm-dialog-actions" style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <Button 
                  type="button" 
                  variant="secondary-site" 
                  style={{ flex: 1 }}
                  disabled={savingGroup}
                  onClick={() => setShowEditModal(false)}
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  variant="primary-crm" 
                  style={{ flex: 1 }}
                  disabled={savingGroup}
                >
                  {savingGroup ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </form>
        </CrmDialog>
      )}
    </div>
  );
}
