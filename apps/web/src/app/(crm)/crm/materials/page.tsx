"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  FolderPlus, 
  Layers, 
  Settings, 
  Eye, 
  EyeOff,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { useActionConfirmation } from "@/shared/ui/useActionConfirmation";

interface Course {
  id: string;
  title: string;
  description: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  status: "draft" | "published" | "archived";
}

interface LessonTemplate {
  id: string;
  module_id: string | null;
  title: string;
  description: string;
  goals: string;
  plan: string;
  duration_minutes: number;
  equipment: string;
  status: "draft" | "published" | "archived";
  sort_order: number;
}

export default function MaterialsPage() {
  const { askAction, modal: actionModal } = useActionConfirmation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<LessonTemplate[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");

  // Modals state
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  
  // New Module Form State
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [moduleSortOrder, setModuleSortOrder] = useState(100);

  // New Lesson Form State
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonGoals, setLessonGoals] = useState("");
  const [lessonPlan, setLessonPlan] = useState("");
  const [lessonDuration, setLessonDuration] = useState(90);
  const [lessonEquipment, setLessonEquipment] = useState("");
  const [lessonSortOrder, setLessonSortOrder] = useState(100);
  const [lessonModuleId, setLessonModuleId] = useState<string>("");

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        // Get org
        const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
        if (!orgRes.data) throw new Error("Organization not found");
        setOrgId(orgRes.data.id);

        // Fetch courses
        const { data: coursesData, error: coursesError } = await (supabase
          .from("courses") as any)
          .select("*")
          .eq("organization_id", orgRes.data.id);

        if (coursesError) throw coursesError;
        setCourses(coursesData || []);

        if (coursesData && coursesData.length > 0) {
          setSelectedCourseId(coursesData[0].id);
        }
      } catch (err) {
        console.error("Error initializing materials page:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedCourseId || !orgId) return;

    async function loadCourseContent() {
      try {
        setLoading(true);
        // Load modules
        const { data: modulesData, error: mError } = await (supabase
          .from("course_modules") as any)
          .select("*")
          .eq("course_id", selectedCourseId)
          .order("sort_order", { ascending: true });

        if (mError) throw mError;
        setModules(modulesData || []);

        // Load lessons
        const { data: lessonsData, error: lError } = await (supabase
          .from("lesson_templates") as any)
          .select("*")
          .eq("course_id", selectedCourseId)
          .order("sort_order", { ascending: true });

        if (lError) throw lError;
        setLessons(lessonsData || []);

        // Expand all modules by default
        const expansions: Record<string, boolean> = {};
        modulesData?.forEach((m: any) => {
          expansions[m.id] = true;
        });
        // Also have a slot for "Uncategorized" lessons
        expansions["uncategorized"] = true;
        setExpandedModules(expansions);

      } catch (err) {
        console.error("Error loading course content:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCourseContent();
  }, [selectedCourseId, orgId]);

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle) return;

    try {
      const { data, error } = await (supabase
        .from("course_modules") as any)
        .insert({
          organization_id: orgId,
          course_id: selectedCourseId,
          title: moduleTitle,
          description: moduleDescription,
          sort_order: moduleSortOrder,
          status: "published"
        })
        .select()
        .single();

      if (error) throw error;

      setModules(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      setExpandedModules(prev => ({ ...prev, [data.id]: true }));
      setModuleTitle("");
      setModuleDescription("");
      setModuleSortOrder(100);
      setShowModuleModal(false);
    } catch (err) {
      console.error("Error creating module:", err);
      alert("Не удалось создать модуль");
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle) return;

    try {
      const { data, error } = await (supabase
        .from("lesson_templates") as any)
        .insert({
          organization_id: orgId,
          course_id: selectedCourseId,
          module_id: lessonModuleId || null,
          title: lessonTitle,
          description: lessonDescription,
          goals: lessonGoals,
          plan: lessonPlan,
          duration_minutes: lessonDuration,
          equipment: lessonEquipment,
          sort_order: lessonSortOrder,
          status: "published"
        })
        .select()
        .single();

      if (error) throw error;

      setLessons(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      setLessonTitle("");
      setLessonDescription("");
      setLessonGoals("");
      setLessonPlan("");
      setLessonDuration(90);
      setLessonEquipment("");
      setLessonSortOrder(100);
      setShowLessonModal(false);
    } catch (err) {
      console.error("Error creating lesson template:", err);
      alert("Не удалось создать урок");
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    const allowed = await askAction({
      title: "Удалить модуль",
      description: "Уроки модуля останутся в курсе, но будут без привязки к разделу.",
      dangerLevel: "danger",
      confirmText: "Удалить",
      requireTypedConfirmation: true,
      expectedText: "УДАЛИТЬ",
    });
    if (!allowed) return;

    try {
      const { error } = await (supabase
        .from("course_modules") as any)
        .delete()
        .eq("id", moduleId);

      if (error) throw error;

      setModules(prev => prev.filter(m => m.id !== moduleId));
      setLessons(prev => prev.map(l => l.module_id === moduleId ? { ...l, module_id: null } : l));
    } catch (err) {
      console.error("Error deleting module:", err);
      alert("Ошибка при удалении модуля");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const allowed = await askAction({
      title: "Удалить шаблон урока",
      description: "Шаблон урока будет удален. Уже проведенные занятия не должны удаляться.",
      dangerLevel: "danger",
      confirmText: "Удалить",
      requireTypedConfirmation: true,
      expectedText: "УДАЛИТЬ",
    });
    if (!allowed) return;

    try {
      const { error } = await (supabase
        .from("lesson_templates") as any)
        .delete()
        .eq("id", lessonId);

      if (error) throw error;

      setLessons(prev => prev.filter(l => l.id !== lessonId));
    } catch (err) {
      console.error("Error deleting lesson:", err);
      alert("Ошибка при удалении урока");
    }
  };

  const toggleModuleStatus = async (module: Module) => {
    const newStatus = module.status === "published" ? "draft" : "published";
    try {
      const { error } = await (supabase
        .from("course_modules") as any)
        .update({ status: newStatus })
        .eq("id", module.id);

      if (error) throw error;

      setModules(prev => prev.map(m => m.id === module.id ? { ...m, status: newStatus } : m));
    } catch (err) {
      console.error("Error toggling module status:", err);
    }
  };

  const toggleLessonStatus = async (lesson: LessonTemplate) => {
    const newStatus = lesson.status === "published" ? "draft" : "published";
    try {
      const { error } = await (supabase
        .from("lesson_templates") as any)
        .update({ status: newStatus })
        .eq("id", lesson.id);

      if (error) throw error;

      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, status: newStatus } : l));
    } catch (err) {
      console.error("Error toggling lesson status:", err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
            Учебные материалы
          </h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
            База знаний, планы уроков, презентации и инструкции для преподавателей
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Button 
            variant="secondary-crm" 
            style={{ display: "flex", alignItems: "center", gap: "8px", height: "40px", padding: "0 16px", borderRadius: "10px" }}
            onClick={() => setShowModuleModal(true)}
          >
            <FolderPlus size={16} />
            <span>Новый модуль</span>
          </Button>
          <Button 
            variant="primary-crm" 
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
            onClick={() => {
              if (modules.length > 0) {
                setLessonModuleId(modules[0].id);
              } else {
                setLessonModuleId("");
              }
              setShowLessonModal(true);
            }}
          >
            <Plus size={16} />
            <span>Новый урок</span>
          </Button>
        </div>
      </div>

      {/* Course Selector Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", gap: "16px", paddingBottom: "1px" }}>
        {courses.map(course => (
          <button
            key={course.id}
            onClick={() => setSelectedCourseId(course.id)}
            style={{
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom: selectedCourseId === course.id ? "2px solid var(--color-primary)" : "2px solid transparent",
              color: selectedCourseId === course.id ? "var(--color-primary)" : "var(--color-text-muted)",
              fontWeight: selectedCourseId === course.id ? 700 : 500,
              fontSize: "var(--font-small)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {course.title}
          </button>
        ))}
        {courses.length === 0 && !loading && (
          <span style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", padding: "12px 0" }}>
            Курсы не найдены. Создайте курс в настройках.
          </span>
        )}
      </div>

      {/* Main Structure Tree */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px", color: "var(--color-text-muted)" }}>
          Загрузка программы курса...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {modules.map(module => {
            const moduleLessons = lessons.filter(l => l.module_id === module.id);
            const isExpanded = expandedModules[module.id];

            return (
              <div 
                key={module.id} 
                className="card-crm" 
                style={{ 
                  padding: "0", 
                  overflow: "hidden",
                  borderColor: module.status === "draft" ? "dashed" : "solid",
                  opacity: module.status === "draft" ? 0.75 : 1
                }}
              >
                {/* Module Bar */}
                <div 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between", 
                    padding: "16px 24px",
                    background: "var(--color-bg)",
                    borderBottom: isExpanded ? "1px solid var(--color-border)" : "none",
                    cursor: "pointer"
                  }}
                  onClick={() => toggleModuleExpand(module.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    <Layers size={18} style={{ color: "var(--color-primary)" }} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 700, fontSize: "16px", color: "var(--color-text)" }}>
                          {module.title}
                        </span>
                        {module.status === "draft" && (
                          <span className="badge badge-gray">Черновик</span>
                        )}
                      </div>
                      {module.description && (
                        <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                          {module.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }} onClick={e => e.stopPropagation()}>
                    <button 
                      title={module.status === "published" ? "Скрыть" : "Опубликовать"} 
                      onClick={() => toggleModuleStatus(module)}
                      style={{
                        padding: "6px",
                        borderRadius: "6px",
                        border: "1px solid var(--color-border)",
                        background: "white",
                        color: "var(--color-text-muted)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      {module.status === "published" ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button 
                      title="Удалить модуль" 
                      onClick={() => handleDeleteModule(module.id)}
                      style={{
                        padding: "6px",
                        borderRadius: "6px",
                        border: "1px solid var(--color-border)",
                        background: "white",
                        color: "var(--color-danger)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Lessons List */}
                {isExpanded && (
                  <div style={{ display: "flex", flexDirection: "column", background: "white" }}>
                    {moduleLessons.map((lesson, idx) => (
                      <div 
                        key={lesson.id} 
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "16px 24px 16px 48px",
                          borderBottom: idx === moduleLessons.length - 1 ? "none" : "1px solid var(--color-border)",
                          opacity: lesson.status === "draft" ? 0.6 : 1
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                          <FileText size={16} style={{ color: "var(--color-text-muted)" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Link 
                                href={`/crm/materials/${lesson.id}`} 
                                style={{ 
                                  fontWeight: 600, 
                                  fontSize: "var(--font-small)", 
                                  color: "var(--color-primary)",
                                  textDecoration: "underline"
                                }}
                              >
                                {lesson.title}
                              </Link>
                              <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                                ({lesson.duration_minutes} мин)
                              </span>
                              {lesson.status === "draft" && (
                                <span className="badge badge-gray">Черновик</span>
                              )}
                            </div>
                            {lesson.description && (
                              <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                                {lesson.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button 
                            title={lesson.status === "published" ? "Скрыть" : "Опубликовать"} 
                            onClick={() => toggleLessonStatus(lesson)}
                            style={{
                              padding: "6px",
                              borderRadius: "6px",
                              border: "1px solid var(--color-border)",
                              background: "white",
                              color: "var(--color-text-muted)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center"
                            }}
                          >
                            {lesson.status === "published" ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <Link href={`/crm/materials/${lesson.id}`}>
                            <button 
                              title="Редактировать материалы" 
                              style={{
                                padding: "6px",
                                borderRadius: "6px",
                                border: "1px solid var(--color-border)",
                                background: "white",
                                color: "var(--color-text-muted)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center"
                              }}
                            >
                              <Edit3 size={14} />
                            </button>
                          </Link>
                          <button 
                            title="Удалить" 
                            onClick={() => handleDeleteLesson(lesson.id)}
                            style={{
                              padding: "6px",
                              borderRadius: "6px",
                              border: "1px solid var(--color-border)",
                              background: "white",
                              color: "var(--color-danger)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center"
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {moduleLessons.length === 0 && (
                      <div style={{ padding: "20px 48px", fontSize: "var(--font-xs)", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                        В этом модуле еще нет уроков. Нажмите "Новый урок", чтобы добавить первый.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Uncategorized Lessons */}
          {lessons.filter(l => l.module_id === null).length > 0 && (
            <div className="card-crm" style={{ padding: "0", overflow: "hidden", borderColor: "var(--color-border)" }}>
              <div 
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  padding: "16px 24px",
                  background: "#F9FAFB",
                  borderBottom: expandedModules["uncategorized"] ? "1px solid var(--color-border)" : "none",
                  cursor: "pointer"
                }}
                onClick={() => toggleModuleExpand("uncategorized")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {expandedModules["uncategorized"] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  <AlertCircle size={18} style={{ color: "var(--color-text-muted)" }} />
                  <span style={{ fontWeight: 700, fontSize: "16px", color: "var(--color-text)" }}>
                    Без модуля (Черновики / Вне разделов)
                  </span>
                </div>
              </div>

              {expandedModules["uncategorized"] && (
                <div style={{ display: "flex", flexDirection: "column", background: "white" }}>
                  {lessons.filter(l => l.module_id === null).map((lesson, idx, arr) => (
                    <div 
                      key={lesson.id} 
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 24px 16px 48px",
                        borderBottom: idx === arr.length - 1 ? "none" : "1px solid var(--color-border)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <FileText size={16} style={{ color: "var(--color-text-muted)" }} />
                        <div>
                          <Link 
                            href={`/crm/materials/${lesson.id}`} 
                            style={{ 
                              fontWeight: 600, 
                              fontSize: "var(--font-small)", 
                              color: "var(--color-primary)",
                              textDecoration: "underline"
                            }}
                          >
                            {lesson.title}
                          </Link>
                          {lesson.description && (
                            <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                              {lesson.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button 
                          title="Опубликовать" 
                          onClick={() => toggleLessonStatus(lesson)}
                          style={{
                            padding: "6px",
                            borderRadius: "6px",
                            border: "1px solid var(--color-border)",
                            background: "white",
                            color: "var(--color-text-muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                          }}
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          title="Удалить" 
                          onClick={() => handleDeleteLesson(lesson.id)}
                          style={{
                            padding: "6px",
                            borderRadius: "6px",
                            border: "1px solid var(--color-border)",
                            background: "white",
                            color: "var(--color-danger)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {modules.length === 0 && lessons.length === 0 && !loading && (
            <div className="card-crm" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px", textAlign: "center", borderStyle: "dashed" }}>
              <Layers size={48} style={{ color: "var(--color-text-muted)", marginBottom: "16px" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>Программа курса пуста</h3>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", maxWidth: "400px", marginBottom: "24px" }}>
                Добавьте первый модуль (раздел курса) или шаблон урока, чтобы начать формировать базу материалов.
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                <Button variant="secondary-crm" onClick={() => setShowModuleModal(true)}>Создать модуль</Button>
                <Button variant="primary-crm" onClick={() => setShowLessonModal(true)}>Добавить урок</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Module Modal */}
      {showModuleModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100
        }}>
          <div className="card-crm" style={{ width: "100%", maxWidth: "500px", padding: "32px", background: "white" }}>
            <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)", marginBottom: "20px" }}>
              Создать модуль курса
            </h3>
            <form onSubmit={handleCreateModule} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Название модуля</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={moduleTitle}
                  onChange={e => setModuleTitle(e.target.value)}
                  placeholder="Например: Простые механизмы"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "100px", padding: "12px 16px", resize: "none" }}
                  value={moduleDescription}
                  onChange={e => setModuleDescription(e.target.value)}
                  placeholder="Чему посвящен модуль..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Порядок сортировки</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={moduleSortOrder}
                  onChange={e => setModuleSortOrder(parseInt(e.target.value, 10))}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <Button type="button" variant="secondary-crm" onClick={() => setShowModuleModal(false)}>Отмена</Button>
                <Button type="submit" variant="primary-crm">Создать</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {showLessonModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100
        }}>
          <div className="card-crm" style={{ width: "100%", maxWidth: "600px", padding: "32px", background: "white", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)", marginBottom: "20px" }}>
              Добавить шаблон урока
            </h3>
            <form onSubmit={handleCreateLesson} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Модуль курса</label>
                <select 
                  className="form-input"
                  value={lessonModuleId}
                  onChange={e => setLessonModuleId(e.target.value)}
                  required
                >
                  <option value="">-- Без модуля (Свободный урок) --</option>
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Название урока</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={lessonTitle}
                  onChange={e => setLessonTitle(e.target.value)}
                  placeholder="Например: Зубчатые передачи"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "80px", padding: "12px 16px", resize: "none" }}
                  value={lessonDescription}
                  onChange={e => setLessonDescription(e.target.value)}
                  placeholder="Краткое описание сути урока..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Цели урока (Goals)</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "80px", padding: "12px 16px", resize: "none" }}
                  value={lessonGoals}
                  onChange={e => setLessonGoals(e.target.value)}
                  placeholder="Каких результатов должны достичь ученики..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">План проведения (Plan)</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "120px", padding: "12px 16px", resize: "none" }}
                  value={lessonPlan}
                  onChange={e => setLessonPlan(e.target.value)}
                  placeholder="1. Разминка (10 мин)&#10;2. Сборка (40 мин)..."
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-group">
                  <label className="form-label">Длительность (минут)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={lessonDuration}
                    onChange={e => setLessonDuration(parseInt(e.target.value, 10))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Порядок (сортировка)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={lessonSortOrder}
                    onChange={e => setLessonSortOrder(parseInt(e.target.value, 10))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Оборудование и детали</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={lessonEquipment}
                  onChange={e => setLessonEquipment(e.target.value)}
                  placeholder="Набор LEGO Start, датчик наклона..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <Button type="button" variant="secondary-crm" onClick={() => setShowLessonModal(false)}>Отмена</Button>
                <Button type="submit" variant="primary-crm">Создать</Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {actionModal}
    </div>
  );
}
