"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { GraduationCap, Plus, Search, Users, Calendar, Clock, Sparkles } from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { isDemoMode } from "@/shared/utils/demo";

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
  const [savingGroup, setSavingGroup] = useState(false);

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
    try {
      const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
      if (!orgRes.data) throw new Error("Org not found");

      const insertData = {
        organization_id: orgRes.data.id,
        title: newTitle,
        course_id: newCourseId,
        teacher_id: newTeacherId || null,
        capacity: parseInt(newCapacity, 10),
        age_from: parseInt(newAgeFrom, 10),
        age_to: parseInt(newAgeTo, 10),
        status: "active" as const
      };

      const { data, error } = await (supabase.from("groups") as any).insert(insertData).select(`
        id,
        title,
        capacity,
        age_from,
        age_to,
        status,
        courses (title),
        profiles (full_name)
      `).single();

      if (error) throw error;

      // Parse and save schedule rules
      const rules = parseSchedule(newSchedule);
      if (!isDemoMode()) {
        for (const rule of rules) {
          await (supabase.from("group_schedule_rules") as any).insert({
            organization_id: orgRes.data.id,
            group_id: data.id,
            weekday: rule.weekday,
            starts_at: rule.starts_at,
            ends_at: rule.ends_at
          });
        }
      }

      const newGroupObj = {
        id: data.id,
        title: data.title,
        courseName: data.courses?.title || "Не указан",
        schedule: formatScheduleRules(rules),
        teacherName: data.profiles?.full_name || "Не назначен",
        ageRange: `${data.age_from}–${data.age_to} лет`,
        capacity: data.capacity,
        enrolled: 0,
        status: data.status
      };

      setGroups([newGroupObj, ...groups]);
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

      const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
      if (!orgRes.data) throw new Error("Org not found");

      // Update groups table
      const { error: groupErr } = await (supabase
        .from("groups") as any)
        .update({
          title: editTitle,
          course_id: editCourseId,
          teacher_id: editTeacherId || null,
          capacity: parseInt(editCapacity, 10),
          age_from: parseInt(editAgeFrom, 10),
          age_to: parseInt(editAgeTo, 10)
        })
        .eq("id", editingGroupId);

      if (groupErr) throw groupErr;

      // Update schedule rules: delete old, insert new
      const { error: deleteErr } = await (supabase
        .from("group_schedule_rules") as any)
        .delete()
        .eq("group_id", editingGroupId);

      if (deleteErr) throw deleteErr;

      for (const rule of rules) {
        await (supabase.from("group_schedule_rules") as any).insert({
          organization_id: orgRes.data.id,
          group_id: editingGroupId,
          weekday: rule.weekday,
          starts_at: rule.starts_at,
          ends_at: rule.ends_at
        });
      }

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

      const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
      if (!orgRes.data) throw new Error("Org not found");

      // Insert enrollment
      const { error: enrollErr } = await (supabase
        .from("enrollments") as any)
        .insert({
          organization_id: orgRes.data.id,
          student_id: studentToAddId,
          group_id: selectedGroup.id,
          status: "active",
          started_on: new Date().toISOString().split("T")[0]
        });

      if (enrollErr) throw enrollErr;

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
    const confirmRemove = window.confirm("Вы уверены, что хотите исключить ученика из группы?");
    if (!confirmRemove) return;

    try {
      const demo = isDemoMode();
      const isMockId = typeof selectedGroup.id === "string" && selectedGroup.id.startsWith("g");

      if (demo || isMockId) {
        setGroupStudents(prev => prev.filter(gs => gs.id !== studentId));
        alert("Ученик исключен (Демо-режим)!");
        return;
      }

      // Update enrollment to cancelled
      const { error: cancelErr } = await (supabase
        .from("enrollments") as any)
        .update({
          status: "cancelled",
          ended_on: new Date().toISOString().split("T")[0]
        })
        .eq("group_id", selectedGroup.id)
        .eq("student_id", studentId)
        .eq("status", "active");

      if (cancelErr) throw cancelErr;

      // Reload drawer students and groups list
      await handleOpenGroupDrawer(selectedGroup);
      await loadData();
      alert("Ученик успешно исключен из группы.");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось исключить ученика: " + err.message);
    }
  };

  const filteredGroups = groups.filter(g => {
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
            Активных групп в филиале: {groups.length}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} variant="primary-crm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Plus size={16} />
          <span>Создать группу</span>
        </Button>
      </div>

      {/* Search & Filters */}
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
              <span className={`badge ${group.status === "active" ? "badge-green" : "badge-amber"}`}>
                {group.status === "active" ? "Активна" : "Черновик"}
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
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
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
            maxWidth: "480px",
            padding: "32px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "24px"
          }}>
            <div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "4px" }}>Создать новую группу</h3>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Заполните параметры учебного класса</p>
            </div>

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
              </div>

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
      {selectedGroup && (
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--color-border)", paddingBottom: "20px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>{selectedGroup.title}</h3>
                <span className={`badge ${selectedGroup.status === "active" ? "badge-green" : "badge-amber"}`}>
                  {selectedGroup.status === "active" ? "Активна" : "Черновик"}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>
                Курс: {selectedGroup.courseName} · Преподаватель: {selectedGroup.teacherName}
              </p>
            </div>
            <button 
              onClick={() => setSelectedGroup(null)}
              style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "14px" }}
            >
              Закрыть [x]
            </button>
          </div>

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
              <div style={{ display: "flex", gap: "8px" }}>
                <select 
                  className="form-input" 
                  value={studentToAddId}
                  onChange={(e) => setStudentToAddId(e.target.value)}
                  style={{ height: "36px", fontSize: "13px" }}
                >
                  <option value="">Выберите ученика...</option>
                  {allStudents
                    .filter(s => !groupStudents.some(gs => gs.id === s.id))
                    .map(s => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))
                  }
                </select>
                <Button 
                  onClick={handleAddStudent} 
                  disabled={!studentToAddId || addingStudentToGroup}
                  variant="primary-crm" 
                  style={{ height: "36px", fontSize: "13px", whiteSpace: "nowrap" }}
                >
                  {addingStudentToGroup ? "..." : "Добавить"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
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
            maxWidth: "480px",
            padding: "32px",
            boxShadow: "0 24px 60px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "24px"
          }}>
            <div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "4px" }}>Редактировать группу</h3>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Обновление параметров учебного класса</p>
            </div>

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
              </div>

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

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
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
          </div>
        </div>
      )}
    </div>
  );
}
