"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  ClipboardList, 
  Plus, 
  Layers, 
  Calendar, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Filter, 
  BookOpen,
  Check,
  AlertCircle
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";

interface HomeworkTemplate {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  estimated_minutes: number | null;
  status: "draft" | "published" | "archived";
}

interface HomeworkAssignment {
  id: string;
  homework_template_id: string;
  group_id: string | null;
  due_at: string | null;
  status: "assigned" | "submitted" | "checked" | "cancelled";
  homework_templates: { title: string } | null;
  groups: { title: string } | null;
}

export default function HomeworkPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "assignments">("templates");
  const [templates, setTemplates] = useState<HomeworkTemplate[]>([]);
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");

  // Create Template Form
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDifficulty, setNewDifficulty] = useState("Средняя");
  const [newEstMinutes, setNewEstMinutes] = useState(30);

  const [groups, setGroups] = useState<any[]>([]);

  // Assign Homework Form
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTemplateId, setAssignTemplateId] = useState("");
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignDueAt, setAssignDueAt] = useState("");
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Get org
        const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
        if (!orgRes.data) throw new Error("Organization not found");
        setOrgId(orgRes.data.id);

        // Fetch templates
        const { data: templatesData } = await (supabase
          .from("homework_templates") as any)
          .select("*")
          .eq("organization_id", orgRes.data.id)
          .order("created_at", { ascending: false });
        setTemplates(templatesData || []);

        // Fetch groups
        const { data: groupsData } = await (supabase
          .from("groups") as any)
          .select("id, title")
          .eq("organization_id", orgRes.data.id);
        setGroups(groupsData || []);

        // Fetch assignments
        const { data: assignmentsData } = await (supabase
          .from("homework_assignments") as any)
          .select(`
            id,
            homework_template_id,
            group_id,
            due_at,
            status,
            homework_templates (title),
            groups (title)
          `)
          .eq("organization_id", orgRes.data.id)
          .order("created_at", { ascending: false });
        setAssignments((assignmentsData as any) || []);

      } catch (err) {
        console.error("Error loading homework data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    try {
      const { data, error } = await (supabase
        .from("homework_templates") as any)
        .insert({
          organization_id: orgId,
          title: newTitle,
          description: newDescription,
          difficulty: newDifficulty,
          estimated_minutes: newEstMinutes,
          status: "published"
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [data, ...prev]);
      setNewTitle("");
      setNewDescription("");
      setNewDifficulty("Средняя");
      setNewEstMinutes(30);
      setShowTemplateModal(false);
      alert("Шаблон домашнего задания успешно добавлен!");
    } catch (err) {
      console.error("Error creating hw template:", err);
      alert("Не удалось создать шаблон");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить этот шаблон? Все выданные задания по нему останутся в базе, но шаблон исчезнет.")) return;

    try {
      const { error } = await (supabase
        .from("homework_templates") as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Error deleting template:", err);
      alert("Ошибка удаления шаблона");
    }
  };

  const handleUpdateAssignmentStatus = async (id: string, newStatus: "assigned" | "submitted" | "checked" | "cancelled") => {
    try {
      const { error } = await (supabase
        .from("homework_assignments") as any)
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setAssignments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch (err) {
      console.error("Error updating assignment status:", err);
      alert("Не удалось обновить статус задания");
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить или отменить это назначение домашнего задания?")) return;
    try {
      const { error } = await (supabase
        .from("homework_assignments") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
      setAssignments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
      alert("Не удалось удалить назначение");
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTemplateId || !assignGroupId || submittingAssign) return;

    try {
      setSubmittingAssign(true);
      const { data, error } = await (supabase
        .from("homework_assignments") as any)
        .insert({
          organization_id: orgId,
          homework_template_id: assignTemplateId,
          group_id: assignGroupId,
          due_at: assignDueAt ? new Date(assignDueAt).toISOString() : null,
          status: "assigned"
        })
        .select(`
          id,
          homework_template_id,
          group_id,
          due_at,
          status,
          homework_templates (title),
          groups (title)
        `)
        .single();

      if (error) throw error;

      setAssignments(prev => [data, ...prev]);
      setAssignTemplateId("");
      setAssignGroupId("");
      setAssignDueAt("");
      setShowAssignModal(false);
      alert("Задание успешно назначено группе!");
    } catch (err) {
      console.error("Error creating assignment:", err);
      alert("Не удалось назначить домашнее задание");
    } finally {
      setSubmittingAssign(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "assigned": return <span className="badge badge-blue">Выдано</span>;
      case "submitted": return <span className="badge badge-amber">На проверке</span>;
      case "checked": return <span className="badge badge-green">Проверено</span>;
      case "cancelled": return <span className="badge badge-gray">Отменено</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  const getDifficultyBadge = (diff: string | null) => {
    switch (diff) {
      case "Легкая": return <span className="badge badge-green" style={{ fontSize: "10px" }}>Легкая</span>;
      case "Средняя": return <span className="badge badge-amber" style={{ fontSize: "10px" }}>Средняя</span>;
      case "Сложная": return <span className="badge badge-red" style={{ fontSize: "10px" }}>Сложная</span>;
      default: return <span className="badge badge-gray" style={{ fontSize: "10px" }}>{diff || "Обычная"}</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
            Домашние задания
          </h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
            Каталог самостоятельных работ и журнал выданных заданий с отслеживанием прогресса
          </p>
        </div>
        {activeTab === "templates" ? (
          <Button 
            variant="primary-crm" 
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
            onClick={() => setShowTemplateModal(true)}
          >
            <Plus size={16} />
            <span>Создать шаблон ДЗ</span>
          </Button>
        ) : (
          <Button 
            variant="primary-crm" 
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
            onClick={() => {
              if (templates.length === 0) {
                alert("Сначала создайте хотя бы один шаблон домашнего задания!");
                return;
              }
              if (groups.length === 0) {
                alert("Сначала создайте хотя бы одну группу в CRM!");
                return;
              }
              setAssignTemplateId(templates[0].id);
              setAssignGroupId(groups[0].id);
              setShowAssignModal(true);
            }}
          >
            <Plus size={16} />
            <span>Назначить ДЗ группе</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", gap: "16px", paddingBottom: "1px" }}>
        <button
          onClick={() => setActiveTab("templates")}
          style={{
            padding: "12px 16px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "templates" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: activeTab === "templates" ? "var(--color-primary)" : "var(--color-text-muted)",
            fontWeight: activeTab === "templates" ? 700 : 500,
            fontSize: "var(--font-small)",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Каталог шаблонов ДЗ ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab("assignments")}
          style={{
            padding: "12px 16px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "assignments" ? "2px solid var(--color-primary)" : "2px solid transparent",
            color: activeTab === "assignments" ? "var(--color-primary)" : "var(--color-text-muted)",
            fontWeight: activeTab === "assignments" ? 700 : 500,
            fontSize: "var(--font-small)",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          Журнал выданных заданий ({assignments.length})
        </button>
      </div>

      {loading ? (
        <div style={{ color: "var(--color-text-muted)", padding: "40px", textAlign: "center" }}>Загрузка...</div>
      ) : activeTab === "templates" ? (
        /* Templates List */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
          {templates.map(tpl => (
            <div key={tpl.id} className="card-crm" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "16px", background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text)" }}>{tpl.title}</h3>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px" }}>
                    {getDifficultyBadge(tpl.difficulty)}
                    {tpl.estimated_minutes && (
                      <span style={{ fontSize: "10px", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "2px" }}>
                        <Clock size={10} />
                        <span>~{tpl.estimated_minutes} мин</span>
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  title="Удалить"
                  onClick={() => handleDeleteTemplate(tpl.id)}
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
              <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", lineHeight: 1.5, flex: 1 }}>
                {tpl.description || "Нет описания"}
              </p>
            </div>
          ))}

          {templates.length === 0 && (
            <div style={{ gridColumn: "span 3", padding: "48px", textAlign: "center", color: "var(--color-text-muted)" }}>
              <ClipboardList size={48} style={{ margin: "0 auto 16px", color: "var(--color-border)" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>Шаблонов домашнего задания пока нет</h3>
              <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", marginBottom: "20px" }}>
                Создайте первый шаблон домашнего задания, чтобы выдавать его ученикам на уроках.
              </p>
              <Button variant="primary-crm" onClick={() => setShowTemplateModal(true)}>Создать шаблон</Button>
            </div>
          )}
        </div>
      ) : (
        /* Assignments Table */
        <div className="card-crm" style={{ padding: 0, overflow: "hidden", background: "white" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg)" }}>
                <th style={{ padding: "16px 24px", fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Группа</th>
                <th style={{ padding: "16px 24px", fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Задание</th>
                <th style={{ padding: "16px 24px", fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Срок сдачи</th>
                <th style={{ padding: "16px 24px", fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Статус</th>
                <th style={{ padding: "16px 24px", fontSize: "var(--font-xs)", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(as => {
                const dueStr = as.due_at ? new Date(as.due_at).toLocaleDateString("ru-RU") : "Без срока";

                return (
                  <tr key={as.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "16px 24px", fontWeight: 700, fontSize: "var(--font-small)" }}>
                      {as.groups ? as.groups.title : "Группа удалена"}
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "var(--font-small)", fontWeight: 600 }}>
                      {as.homework_templates ? as.homework_templates.title : "Удаленный шаблон"}
                    </td>
                    <td style={{ padding: "16px 24px", fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
                      {dueStr}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      {getStatusBadge(as.status)}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {as.status === "assigned" && (
                          <Button 
                            variant="secondary-crm" 
                            style={{ height: "28px", padding: "0 10px", fontSize: "11px", borderRadius: "6px" }}
                            onClick={() => handleUpdateAssignmentStatus(as.id, "submitted")}
                          >
                            Сдали работу
                          </Button>
                        )}
                        {as.status === "submitted" && (
                          <Button 
                            variant="primary-crm" 
                            style={{ height: "28px", padding: "0 10px", fontSize: "11px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "2px" }}
                            onClick={() => handleUpdateAssignmentStatus(as.id, "checked")}
                          >
                            <Check size={12} />
                            <span>Принять / Проверить</span>
                          </Button>
                        )}
                        {as.status === "checked" && (
                          <span style={{ fontSize: "var(--font-xs)", color: "var(--color-success)", fontWeight: 700 }}>Проверено</span>
                        )}
                        {as.status !== "checked" && (
                          <button 
                            title="Отменить назначение"
                            onClick={() => handleDeleteAssignment(as.id)}
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
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {assignments.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: "48px", textAlign: "center", color: "var(--color-text-muted)" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <AlertCircle size={32} />
                      <span>Выданные домашние задания не найдены. Преподаватели выдают задания на рабочем экране урока.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Template Modal */}
      {showTemplateModal && (
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
              Создать шаблон ДЗ
            </h3>
            <form onSubmit={handleCreateTemplate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Название задания</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Например: Сборка колесной пары"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Инструкция / Описание</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "100px", padding: "12px 16px", resize: "none" }}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Что нужно сделать ребенку дома..."
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="form-group">
                  <label className="form-label">Сложность</label>
                  <select 
                    className="form-input"
                    value={newDifficulty}
                    onChange={e => setNewDifficulty(e.target.value)}
                  >
                    <option value="Легкая">Легкая</option>
                    <option value="Средняя">Средняя</option>
                    <option value="Сложная">Сложная</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Время выполнения (минут)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={newEstMinutes}
                    onChange={e => setNewEstMinutes(parseInt(e.target.value, 10))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <Button type="button" variant="secondary-crm" onClick={() => setShowTemplateModal(false)}>Отмена</Button>
                <Button type="submit" variant="primary-crm">Создать</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Homework Modal */}
      {showAssignModal && (
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
              Назначить ДЗ группе
            </h3>
            <form onSubmit={handleCreateAssignment} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Выберите задание</label>
                <select 
                  className="form-input"
                  value={assignTemplateId}
                  onChange={e => setAssignTemplateId(e.target.value)}
                  required
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Выберите группу</label>
                <select 
                  className="form-input"
                  value={assignGroupId}
                  onChange={e => setAssignGroupId(e.target.value)}
                  required
                >
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Срок сдачи (Due date)</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={assignDueAt}
                  onChange={e => setAssignDueAt(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <Button type="button" variant="secondary-crm" onClick={() => setShowAssignModal(false)}>Отмена</Button>
                <Button type="submit" variant="primary-crm" disabled={submittingAssign}>
                  {submittingAssign ? "Назначение..." : "Назначить"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
