"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit,
  ExternalLink, 
  FileText, 
  Image as ImageIcon, 
  Code, 
  Video, 
  Sliders, 
  Save, 
  Eye, 
  Link2,
  FileDown
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";

interface LessonTemplate {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  description: string;
  goals: string;
  plan: string;
  duration_minutes: number;
  teacher_notes: string;
  equipment: string;
  status: "draft" | "published" | "archived";
}

interface LessonMaterial {
  id: string;
  title: string;
  type: string;
  visibility: string;
  file_url: string | null;
  external_url: string | null;
  content: string | null;
  sort_order: number;
}

export default function LessonDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params.lessonId as string;

  const [lesson, setLesson] = useState<LessonTemplate | null>(null);
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");

  // Edit Lesson Info State
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGoals, setEditGoals] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [editDuration, setEditDuration] = useState(90);
  const [editEquipment, setEditEquipment] = useState("");
  const [editTeacherNotes, setEditTeacherNotes] = useState("");

  // New Material State
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [matTitle, setMatTitle] = useState("");
  const [matType, setMatType] = useState("lesson_plan");
  const [matVisibility, setMatVisibility] = useState("teacher_only");
  const [matExternalUrl, setMatExternalUrl] = useState("");
  const [matContent, setMatContent] = useState("");
  const [matSortOrder, setMatSortOrder] = useState(100);
  const [creatingMaterial, setCreatingMaterial] = useState(false);

  // Edit Material State
  const [showEditMaterialModal, setShowEditMaterialModal] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState("");
  const [editMatTitle, setEditMatTitle] = useState("");
  const [editMatType, setEditMatType] = useState("lesson_plan");
  const [editMatVisibility, setEditMatVisibility] = useState("teacher_only");
  const [editMatExternalUrl, setEditMatExternalUrl] = useState("");
  const [editMatContent, setEditMatContent] = useState("");
  const [editMatSortOrder, setEditMatSortOrder] = useState(100);
  const [savingMaterial, setSavingMaterial] = useState(false);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!lessonId) return;

    async function loadData() {
      try {
        setLoading(true);
        // Get org
        const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
        if (!orgRes.data) throw new Error("Organization not found");
        setOrgId(orgRes.data.id);

        // Fetch lesson
        const { data: lessonData, error: lessonError } = await (supabase
          .from("lesson_templates") as any)
          .select("*")
          .eq("id", lessonId)
          .single();

        if (lessonError) throw lessonError;
        setLesson(lessonData);
        
        // Setup editing state
        setEditTitle(lessonData.title);
        setEditDescription(lessonData.description || "");
        setEditGoals(lessonData.goals || "");
        setEditPlan(lessonData.plan || "");
        setEditDuration(lessonData.duration_minutes);
        setEditEquipment(lessonData.equipment || "");
        setEditTeacherNotes(lessonData.teacher_notes || "");

        // Fetch materials
        const { data: materialsData, error: matError } = await (supabase
          .from("lesson_materials") as any)
          .select("*")
          .eq("lesson_template_id", lessonId)
          .order("sort_order", { ascending: true });

        if (matError) throw matError;
        setMaterials(materialsData || []);

      } catch (err) {
        console.error("Error loading lesson details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [lessonId]);

  const handleUpdateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson) return;

    try {
      const { error } = await (supabase
        .from("lesson_templates") as any)
        .update({
          title: editTitle,
          description: editDescription,
          goals: editGoals,
          plan: editPlan,
          duration_minutes: editDuration,
          equipment: editEquipment,
          teacher_notes: editTeacherNotes
        })
        .eq("id", lesson.id);

      if (error) throw error;

      setLesson(prev => prev ? {
        ...prev,
        title: editTitle,
        description: editDescription,
        goals: editGoals,
        plan: editPlan,
        duration_minutes: editDuration,
        equipment: editEquipment,
        teacher_notes: editTeacherNotes
      } : null);

      setIsEditingLesson(false);
    } catch (err) {
      console.error("Error updating lesson:", err);
      alert("Не удалось сохранить изменения урока");
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle || creatingMaterial) return;

    try {
      setCreatingMaterial(true);
      const { data, error } = await (supabase
        .from("lesson_materials") as any)
        .insert({
          organization_id: orgId,
          lesson_template_id: lessonId,
          title: matTitle,
          type: matType,
          visibility: matVisibility,
          external_url: matExternalUrl || null,
          content: matContent || null,
          sort_order: matSortOrder
        })
        .select()
        .single();

      if (error) throw error;

      setMaterials(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
      setMatTitle("");
      setMatType("lesson_plan");
      setMatVisibility("teacher_only");
      setMatExternalUrl("");
      setMatContent("");
      setMatSortOrder(100);
      setShowMaterialModal(false);
    } catch (err) {
      console.error("Error creating material:", err);
      alert("Не удалось добавить материал");
    } finally {
      setCreatingMaterial(false);
    }
  };

  const handleOpenEditMaterialModal = (mat: LessonMaterial) => {
    setEditingMaterialId(mat.id);
    setEditMatTitle(mat.title);
    setEditMatType(mat.type);
    setEditMatVisibility(mat.visibility);
    setEditMatExternalUrl(mat.external_url || "");
    setEditMatContent(mat.content || "");
    setEditMatSortOrder(mat.sort_order);
    setShowEditMaterialModal(true);
  };

  const handleUpdateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingMaterial) return;
    try {
      setSavingMaterial(true);

      const { error } = await (supabase
        .from("lesson_materials") as any)
        .update({
          title: editMatTitle,
          type: editMatType,
          visibility: editMatVisibility,
          external_url: editMatExternalUrl || null,
          content: editMatContent || null,
          sort_order: editMatSortOrder
        })
        .eq("id", editingMaterialId);

      if (error) throw error;

      setMaterials(prev => prev.map(m => m.id === editingMaterialId ? {
        ...m,
        title: editMatTitle,
        type: editMatType,
        visibility: editMatVisibility,
        external_url: editMatExternalUrl || null,
        content: editMatContent || null,
        sort_order: editMatSortOrder
      } : m).sort((a, b) => a.sort_order - b.sort_order));

      setShowEditMaterialModal(false);
      alert("Материал успешно обновлен!");
    } catch (err: any) {
      console.error(err);
      alert("Не удалось обновить материал: " + err.message);
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (matId: string) => {
    if (!confirm("Удалить этот методический материал?")) return;

    try {
      const { error } = await (supabase
        .from("lesson_materials") as any)
        .delete()
        .eq("id", matId);

      if (error) throw error;

      setMaterials(prev => prev.filter(m => m.id !== matId));
    } catch (err) {
      console.error("Error deleting material:", err);
      alert("Не удалось удалить материал");
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case "lesson_plan": return <FileText size={18} style={{ color: "var(--color-primary)" }} />;
      case "presentation": return <Sliders size={18} style={{ color: "var(--color-warning-dark)" }} />;
      case "build_scheme": return <ImageIcon size={18} style={{ color: "var(--color-success)" }} />;
      case "code_listing": return <Code size={18} style={{ color: "#8B5CF6" }} />;
      case "video": return <Video size={18} style={{ color: "var(--color-danger)" }} />;
      default: return <FileText size={18} style={{ color: "var(--color-text-muted)" }} />;
    }
  };

  const getVisibilityLabel = (vis: string) => {
    switch (vis) {
      case "admin_only": return <span className="badge badge-red">Только админ</span>;
      case "teacher_only": return <span className="badge badge-amber">Преподаватель</span>;
      case "student_visible": return <span className="badge badge-blue">Ученики</span>;
      case "parent_visible": return <span className="badge badge-purple">Родители</span>;
      case "public_preview": return <span className="badge badge-green">Публичный</span>;
      default: return <span className="badge badge-gray">{vis}</span>;
    }
  };

  const getMaterialTypeLabel = (t: string) => {
    switch (t) {
      case "lesson_plan": return "План урока";
      case "presentation": return "Презентация";
      case "build_scheme": return "Схема сборки";
      case "code_listing": return "Код программы";
      case "student_handout": return "Раздатка";
      case "homework": return "Домашнее задание";
      case "video": return "Видео";
      default: return t;
    }
  };

  if (loading) {
    return <div style={{ color: "var(--color-text-muted)", padding: "40px", textAlign: "center" }}>Загрузка шаблона урока...</div>;
  }

  if (!lesson) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "var(--color-danger)" }}>Шаблон урока не найден</p>
        <Link href="/crm/materials" style={{ color: "var(--color-primary)", textDecoration: "underline", marginTop: "12px", display: "inline-block" }}>
          Вернуться к материалам
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Back button and title */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Link href="/crm/materials" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
          <ArrowLeft size={14} />
          <span>Назад к учебным материалам</span>
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)" }}>{lesson.title}</h1>
              <span className={`badge ${lesson.status === "published" ? "badge-green" : "badge-gray"}`}>
                {lesson.status === "published" ? "Опубликован" : "Черновик"}
              </span>
            </div>
            <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginTop: "4px" }}>
              Длительность занятия: {lesson.duration_minutes} минут · Шаблон урока
            </p>
          </div>
          {!isEditingLesson && (
            <Button variant="secondary-crm" onClick={() => setIsEditingLesson(true)}>Редактировать параметры</Button>
          )}
        </div>
      </div>

      {/* Main Grid: Parameters vs Materials */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "32px", alignItems: "start" }}>
        
        {/* Left Column: Lesson details (Goals, Plan, Notes) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {isEditingLesson ? (
            <form onSubmit={handleUpdateLesson} className="card-crm" style={{ display: "flex", flexDirection: "column", gap: "20px", background: "white" }}>
              <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)" }}>Параметры урока</h3>
              
              <div className="form-group">
                <label className="form-label">Название урока</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Описание</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "70px", padding: "10px 14px", resize: "none" }}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Цели урока (Goals)</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "70px", padding: "10px 14px", resize: "none" }}
                  value={editGoals}
                  onChange={e => setEditGoals(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">План проведения (Plan)</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "120px", padding: "10px 14px", resize: "none" }}
                  value={editPlan}
                  onChange={e => setEditPlan(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Оборудование и детали</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editEquipment}
                  onChange={e => setEditEquipment(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Заметки для преподавателя</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "80px", padding: "10px 14px", resize: "none" }}
                  value={editTeacherNotes}
                  onChange={e => setEditTeacherNotes(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <Button type="button" variant="secondary-crm" onClick={() => setIsEditingLesson(false)}>Отмена</Button>
                <Button type="submit" variant="primary-crm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Save size={16} />
                  <span>Сохранить параметры</span>
                </Button>
              </div>
            </form>
          ) : (
            <div className="card-crm" style={{ display: "flex", flexDirection: "column", gap: "24px", background: "white" }}>
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  Описание урока
                </h3>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text)", lineHeight: 1.6 }}>
                  {lesson.description || "Описание отсутствует"}
                </p>
              </div>

              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "20px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  Цели обучения (Goals)
                </h3>
                <p style={{ fontSize: "var(--font-small)", color: "var(--color-text)", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                  {lesson.goals || "Цели не сформулированы"}
                </p>
              </div>

              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "20px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  План проведения занятия (Lesson Plan)
                </h3>
                <div style={{ 
                  fontSize: "var(--font-small)", 
                  color: "var(--color-text)", 
                  lineHeight: 1.6, 
                  whiteSpace: "pre-line", 
                  background: "var(--color-bg)",
                  padding: "16px",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                  fontFamily: "monospace"
                }}>
                  {lesson.plan || "План не задан"}
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                    Оборудование
                  </h3>
                  <span style={{ fontSize: "var(--font-small)", fontWeight: 600 }}>{lesson.equipment || "Конструкторы LEGO"}</span>
                </div>
                <div>
                  <h3 style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                    Длительность
                  </h3>
                  <span style={{ fontSize: "var(--font-small)", fontWeight: 600 }}>{lesson.duration_minutes} минут</span>
                </div>
              </div>

              {lesson.teacher_notes && (
                <div style={{ 
                  borderTop: "1px solid var(--color-border)", 
                  paddingTop: "20px",
                  background: "#FFFBEB",
                  margin: "0 -24px -24px -24px",
                  padding: "24px",
                  borderBottomLeftRadius: "14px",
                  borderBottomRightRadius: "14px",
                  borderTopWidth: "1px",
                  borderColor: "#FDE68A"
                }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#B45309", marginBottom: "6px" }}>
                    Заметки для преподавателя
                  </h3>
                  <p style={{ fontSize: "var(--font-xs)", color: "#92400E", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                    {lesson.teacher_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: List of Lesson Materials */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="card-crm" style={{ background: "white", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)" }}>Методические материалы</h3>
              <Button 
                variant="primary-crm" 
                style={{ display: "flex", alignItems: "center", gap: "6px", height: "32px", padding: "0 10px", borderRadius: "8px", fontSize: "12px" }}
                onClick={() => setShowMaterialModal(true)}
              >
                <Plus size={14} />
                <span>Добавить</span>
              </Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {materials.map((mat) => (
                <div 
                  key={mat.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "16px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "10px",
                    background: "var(--color-bg)",
                    gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <div style={{ marginTop: "3px" }}>
                        {getMaterialIcon(mat.type)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "var(--font-small)", color: "var(--color-text)" }}>
                          {mat.title}
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
                          <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                            {getMaterialTypeLabel(mat.type)}
                          </span>
                          ·
                          {getVisibilityLabel(mat.visibility)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        title="Редактировать материал"
                        onClick={() => handleOpenEditMaterialModal(mat)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-primary)",
                          cursor: "pointer",
                          padding: "4px"
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        title="Удалить материал"
                        onClick={() => handleDeleteMaterial(mat.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-danger)",
                          cursor: "pointer",
                          padding: "4px"
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Resource action links or display content */}
                  {mat.external_url && (
                    <a 
                      href={mat.external_url} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        color: "var(--color-primary)",
                        fontWeight: 600,
                        alignSelf: "flex-start",
                        marginTop: "4px"
                      }}
                    >
                      <ExternalLink size={12} />
                      <span>Открыть внешний ресурс ({new URL(mat.external_url).hostname})</span>
                    </a>
                  )}

                  {mat.content && (
                    <div style={{ 
                      fontSize: "12px", 
                      color: "var(--color-text-muted)", 
                      background: "white", 
                      padding: "10px 14px", 
                      borderRadius: "6px", 
                      border: "1px solid var(--color-border)",
                      marginTop: "6px",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      maxHeight: "150px",
                      overflowY: "auto"
                    }}>
                      {mat.content}
                    </div>
                  )}
                </div>
              ))}

              {materials.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "var(--font-small)", border: "1px dashed var(--color-border)", borderRadius: "10px" }}>
                  Нет прикрепленных файлов или инструкций. Добавьте схемы сборки, презентации или планы урока.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Material Modal */}
      {showMaterialModal && (
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
              Добавить методический материал
            </h3>
            <form onSubmit={handleCreateMaterial} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Название материала</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={matTitle}
                  onChange={e => setMatTitle(e.target.value)}
                  placeholder="Например: Схема сборки гусениц"
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-group">
                  <label className="form-label">Тип материала</label>
                  <select 
                    className="form-input"
                    value={matType}
                    onChange={e => setMatType(e.target.value)}
                  >
                    <option value="lesson_plan">План-конспект</option>
                    <option value="presentation">Презентация</option>
                    <option value="build_scheme">Схема сборки</option>
                    <option value="code_listing">Код программы</option>
                    <option value="student_handout">Раздаточный материал</option>
                    <option value="video">Видео-ролик</option>
                    <option value="external_link">Внешняя ссылка</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Видимость</label>
                  <select 
                    className="form-input"
                    value={matVisibility}
                    onChange={e => setMatVisibility(e.target.value)}
                  >
                    <option value="teacher_only">Только учитель</option>
                    <option value="student_visible">Виден ученикам</option>
                    <option value="parent_visible">Виден родителям</option>
                    <option value="admin_only">Только администратор</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ссылка на ресурс (Google Doc, LEGO и др.)</label>
                <input 
                  type="url" 
                  className="form-input" 
                  value={matExternalUrl}
                  onChange={e => setMatExternalUrl(e.target.value)}
                  placeholder="https://docs.google.com/..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Текст материала / Код программы</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "120px", padding: "12px 16px", resize: "none", fontFamily: "monospace" }}
                  value={matContent}
                  onChange={e => setMatContent(e.target.value)}
                  placeholder="Вставьте листинг кода или текстовое примечание..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <Button type="button" variant="secondary-crm" disabled={creatingMaterial} onClick={() => setShowMaterialModal(false)}>Отмена</Button>
                <Button type="submit" variant="primary-crm" disabled={creatingMaterial}>
                  {creatingMaterial ? "Добавление..." : "Добавить"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Material Modal */}
      {showEditMaterialModal && (
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
              Редактировать методический материал
            </h3>
            <form onSubmit={handleUpdateMaterial} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Название материала</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editMatTitle}
                  onChange={e => setEditMatTitle(e.target.value)}
                  placeholder="Например: Схема сборки гусениц"
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: "16px" }}>
                <div className="form-group">
                  <label className="form-label">Тип</label>
                  <select 
                    className="form-input"
                    value={editMatType}
                    onChange={e => setEditMatType(e.target.value)}
                  >
                    <option value="lesson_plan">План-конспект</option>
                    <option value="presentation">Презентация</option>
                    <option value="build_scheme">Схема сборки</option>
                    <option value="code_listing">Код программы</option>
                    <option value="student_handout">Раздаточный материал</option>
                    <option value="video">Видео-ролик</option>
                    <option value="external_link">Внешняя ссылка</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Видимость</label>
                  <select 
                    className="form-input"
                    value={editMatVisibility}
                    onChange={e => setEditMatVisibility(e.target.value)}
                  >
                    <option value="teacher_only">Только учитель</option>
                    <option value="student_visible">Виден ученикам</option>
                    <option value="parent_visible">Виден родителям</option>
                    <option value="admin_only">Только администратор</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Сортировка</label>
                  <input 
                    type="number"
                    className="form-input"
                    value={editMatSortOrder}
                    onChange={e => setEditMatSortOrder(parseInt(e.target.value, 10) || 100)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ссылка на ресурс (Google Doc, LEGO и др.)</label>
                <input 
                  type="url" 
                  className="form-input" 
                  value={editMatExternalUrl}
                  onChange={e => setEditMatExternalUrl(e.target.value)}
                  placeholder="https://docs.google.com/..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Текст материала / Код программы</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "120px", padding: "12px 16px", resize: "none", fontFamily: "monospace" }}
                  value={editMatContent}
                  onChange={e => setEditMatContent(e.target.value)}
                  placeholder="Вставьте листинг кода или текстовое примечание..."
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <Button type="button" variant="secondary-crm" disabled={savingMaterial} onClick={() => setShowEditMaterialModal(false)}>Отмена</Button>
                <Button type="submit" variant="primary-crm" disabled={savingMaterial}>
                  {savingMaterial ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
