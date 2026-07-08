"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@robotics-crm/ui";
import { 
  PhoneCall, 
  Plus, 
  Trash2, 
  Search, 
  FileText, 
  MessageSquare, 
  CheckSquare, 
  AlertCircle,
  HelpCircle,
  Hash,
  Edit
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { useActionConfirmation } from "@/shared/ui/useActionConfirmation";

interface CallScript {
  id: string;
  title: string;
  stage: string | null;
  content: string;
  checklist: string[];
  is_active: boolean;
}

interface Objection {
  id: string;
  title: string;
  category: string | null;
  recommended_answer: string;
  tags: string[];
  is_active: boolean;
}

export default function ScriptsPage() {
  const { askAction, modal: actionModal } = useActionConfirmation();
  const [activeTab, setActiveTab] = useState<"scripts" | "objections">("scripts");
  const [scripts, setScripts] = useState<CallScript[]>([]);
  const [objections, setObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Modals state
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [showObjectionModal, setShowObjectionModal] = useState(false);

  // New Script State
  const [scriptTitle, setScriptTitle] = useState("");
  const [scriptStage, setScriptStage] = useState("Знакомство");
  const [scriptContent, setScriptContent] = useState("");
  const [scriptChecklistInput, setScriptChecklistInput] = useState("");

  // New Objection State
  const [objTitle, setObjTitle] = useState("");
  const [objCategory, setObjCategory] = useState("Цена");
  const [objRecAnswer, setObjRecAnswer] = useState("");
  const [objTagsInput, setObjTagsInput] = useState("");

  const [editingScriptId, setEditingScriptId] = useState<string | null>(null);
  const [editingObjectionId, setEditingObjectionId] = useState<string | null>(null);
  const [submittingScript, setSubmittingScript] = useState(false);
  const [submittingObjection, setSubmittingObjection] = useState(false);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Get org
        const orgRes = await supabase.from("organizations").select("id").eq("slug", "robotics-lipetsk").single() as any;
        if (!orgRes.data) throw new Error("Organization not found");
        setOrgId(orgRes.data.id);

        // Fetch call scripts
        const { data: scriptsData } = await (supabase
          .from("call_scripts") as any)
          .select("*")
          .eq("organization_id", orgRes.data.id)
          .eq("is_active", true);
        setScripts(scriptsData || []);

        // Fetch objections
        const { data: objectionsData } = await (supabase
          .from("objections") as any)
          .select("*")
          .eq("organization_id", orgRes.data.id)
          .eq("is_active", true);
        setObjections(objectionsData || []);

      } catch (err) {
        console.error("Error loading sales scripts / objections:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleCreateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptTitle || !scriptContent || submittingScript) return;

    try {
      setSubmittingScript(true);
      const checklistArray = scriptChecklistInput
        .split("\n")
        .map(item => item.trim())
        .filter(Boolean);

      if (editingScriptId) {
        const { data, error } = await (supabase
          .from("call_scripts") as any)
          .update({
            title: scriptTitle,
            stage: scriptStage,
            content: scriptContent,
            checklist: checklistArray
          })
          .eq("id", editingScriptId)
          .select()
          .single();

        if (error) throw error;

        setScripts(prev => prev.map(s => s.id === editingScriptId ? data : s));
        setEditingScriptId(null);
        alert("Скрипт успешно сохранен!");
      } else {
        const { data, error } = await (supabase
          .from("call_scripts") as any)
          .insert({
            organization_id: orgId,
            title: scriptTitle,
            stage: scriptStage,
            content: scriptContent,
            checklist: checklistArray,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;

        setScripts(prev => [...prev, data]);
        alert("Скрипт звонка успешно добавлен!");
      }

      setScriptTitle("");
      setScriptStage("Знакомство");
      setScriptContent("");
      setScriptChecklistInput("");
      setShowScriptModal(false);
    } catch (err) {
      console.error("Error saving script:", err);
      alert("Не удалось сохранить скрипт");
    } finally {
      setSubmittingScript(false);
    }
  };

  const handleCreateObjection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objTitle || !objRecAnswer || submittingObjection) return;

    try {
      setSubmittingObjection(true);
      const tagsArray = objTagsInput
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);

      if (editingObjectionId) {
        const { data, error } = await (supabase
          .from("objections") as any)
          .update({
            title: objTitle,
            category: objCategory,
            recommended_answer: objRecAnswer,
            tags: tagsArray
          })
          .eq("id", editingObjectionId)
          .select()
          .single();

        if (error) throw error;

        setObjections(prev => prev.map(o => o.id === editingObjectionId ? data : o));
        setEditingObjectionId(null);
        alert("Возражение успешно сохранено!");
      } else {
        const { data, error } = await (supabase
          .from("objections") as any)
          .insert({
            organization_id: orgId,
            title: objTitle,
            category: objCategory,
            recommended_answer: objRecAnswer,
            tags: tagsArray,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;

        setObjections(prev => [...prev, data]);
        alert("Возражение успешно добавлено в справочник!");
      }

      setObjTitle("");
      setObjCategory("Цена");
      setObjRecAnswer("");
      setObjTagsInput("");
      setShowObjectionModal(false);
    } catch (err) {
      console.error("Error saving objection:", err);
      alert("Не удалось сохранить возражение");
    } finally {
      setSubmittingObjection(false);
    }
  };

  const handleEditScript = (script: CallScript) => {
    setScriptTitle(script.title);
    setScriptStage(script.stage || "Знакомство");
    setScriptContent(script.content);
    setScriptChecklistInput(script.checklist ? script.checklist.join("\n") : "");
    setEditingScriptId(script.id);
    setShowScriptModal(true);
  };

  const handleEditObjection = (obj: Objection) => {
    setObjTitle(obj.title);
    setObjCategory(obj.category || "Цена");
    setObjRecAnswer(obj.recommended_answer);
    setObjTagsInput(obj.tags ? obj.tags.join(", ") : "");
    setEditingObjectionId(obj.id);
    setShowObjectionModal(true);
  };

  const handleDeleteScript = async (id: string) => {
    const allowed = await askAction({
      title: "Скрыть скрипт",
      description: "Скрипт будет деактивирован и скрыт из рабочего списка.",
      dangerLevel: "warning",
      confirmText: "Скрыть",
    });
    if (!allowed) return;

    try {
      const { error } = await (supabase
        .from("call_scripts") as any)
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      setScripts(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("Error deleting script:", err);
      alert("Не удалось удалить скрипт");
    }
  };

  const handleDeleteObjection = async (id: string) => {
    const allowed = await askAction({
      title: "Скрыть возражение",
      description: "Возражение будет деактивировано и скрыто из рабочего списка.",
      dangerLevel: "warning",
      confirmText: "Скрыть",
    });
    if (!allowed) return;

    try {
      const { error } = await (supabase
        .from("objections") as any)
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      setObjections(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      console.error("Error deleting objection:", err);
      alert("Не удалось удалить возражение");
    }
  };

  const handleToggleChecklist = (scriptId: string, index: number) => {
    const key = `${scriptId}-${index}`;
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const filteredScripts = scripts.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.stage && s.stage.toLowerCase().includes(searchQuery.toLowerCase())) ||
    s.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredObjections = objections.filter(o => 
    o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.category && o.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
    o.recommended_answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: "4px" }}>
            Скрипты и Возражения
          </h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>
            Справочники для менеджеров по продажам: алгоритмы диалогов и готовые сценарии работы с сомнениями клиентов
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {activeTab === "scripts" ? (
            <Button 
              variant="primary-crm" 
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
              onClick={() => setShowScriptModal(true)}
            >
              <Plus size={16} />
              <span>Создать скрипт</span>
            </Button>
          ) : (
            <Button 
              variant="primary-crm" 
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
              onClick={() => setShowObjectionModal(true)}
            >
              <Plus size={16} />
              <span>Добавить возражение</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs and Search */}
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--color-border)", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "16px", paddingBottom: "1px" }}>
          <button
            onClick={() => { setActiveTab("scripts"); setSearchQuery(""); }}
            style={{
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "scripts" ? "2px solid var(--color-primary)" : "2px solid transparent",
              color: activeTab === "scripts" ? "var(--color-primary)" : "var(--color-text-muted)",
              fontWeight: activeTab === "scripts" ? 700 : 500,
              fontSize: "var(--font-small)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Скрипты звонков ({scripts.length})
          </button>
          <button
            onClick={() => { setActiveTab("objections"); setSearchQuery(""); }}
            style={{
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "objections" ? "2px solid var(--color-primary)" : "2px solid transparent",
              color: activeTab === "objections" ? "var(--color-primary)" : "var(--color-text-muted)",
              fontWeight: activeTab === "objections" ? 700 : 500,
              fontSize: "var(--font-small)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Работа с возражениями ({objections.length})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", width: "260px", marginBottom: "8px" }}>
          <Search size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--color-text-muted)" }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder={activeTab === "scripts" ? "Поиск по скриптам..." : "Поиск по возражениям..."}
            style={{ height: "36px", paddingLeft: "36px", borderRadius: "8px", fontSize: "12px" }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ color: "var(--color-text-muted)", padding: "40px", textAlign: "center" }}>Загрузка базы продаж...</div>
      ) : activeTab === "scripts" ? (
        /* Scripts View */
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {filteredScripts.map(script => (
            <div key={script.id} className="card-crm" style={{ background: "white", padding: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ fontSize: "var(--font-h3)", fontFamily: "var(--font-geologica)" }}>{script.title}</h3>
                    {script.stage && (
                      <span className="badge badge-blue">{script.stage}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    title="Редактировать скрипт"
                    onClick={() => handleEditScript(script)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-primary)",
                      cursor: "pointer",
                      padding: "4px"
                    }}
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    title="Удалить скрипт"
                    onClick={() => handleDeleteScript(script.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-danger)",
                      cursor: "pointer",
                      padding: "4px"
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Grid content: Script body vs Checklist */}
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "32px" }}>
                <div style={{ background: "var(--color-bg)", padding: "20px", borderRadius: "10px", border: "1px solid var(--color-border)", whiteSpace: "pre-line", fontSize: "14px", lineHeight: 1.6, color: "var(--color-text)" }}>
                  {script.content}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                    <CheckSquare size={14} />
                    <span>Чек-лист (локальный для текущего звонка, не сохраняется)</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {script.checklist && script.checklist.map((item, idx) => {
                      const isChecked = !!checkedItems[`${script.id}-${idx}`];
                      return (
                        <label 
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 14px",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: isChecked ? "var(--color-success-soft)" : "white",
                            color: isChecked ? "var(--color-success)" : "var(--color-text)",
                            transition: "all 0.2s"
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => handleToggleChecklist(script.id, idx)}
                            style={{ cursor: "pointer" }}
                          />
                          <span style={{ textDecoration: isChecked ? "line-through" : "none" }}>{item}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredScripts.length === 0 && (
            <div style={{ padding: "48px", textAlign: "center", color: "var(--color-text-muted)" }}>
              <AlertCircle size={48} style={{ margin: "0 auto 16px", color: "var(--color-border)" }} />
              <h3>Скрипты не найдены</h3>
            </div>
          )}
        </div>
      ) : (
        /* Objections View */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
          {filteredObjections.map(obj => (
            <div key={obj.id} className="card-crm" style={{ display: "flex", flexDirection: "column", gap: "16px", background: "white" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 700 }}>Возражение: "{obj.title}"</h3>
                    {obj.category && (
                      <span className="badge badge-amber">{obj.category}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                    {obj.tags.map((tag, tIdx) => (
                      <span key={tIdx} style={{ display: "inline-flex", alignItems: "center", gap: "2px", fontSize: "10px", color: "var(--color-text-muted)", background: "var(--color-bg)", padding: "2px 6px", borderRadius: "4px" }}>
                        <Hash size={8} />
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    title="Редактировать"
                    onClick={() => handleEditObjection(obj)}
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
                    title="Удалить"
                    onClick={() => handleDeleteObjection(obj.id)}
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

              <div style={{ background: "#F0FDF4", padding: "16px", borderRadius: "8px", border: "1px solid #DCFCE7", fontSize: "12px", lineHeight: 1.6, color: "#166534" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontWeight: 700, marginBottom: "6px" }}>
                  <MessageSquare size={12} />
                  <span>Рекомендованный ответ (подсказка):</span>
                </div>
                <p style={{ fontStyle: "italic", whiteSpace: "pre-wrap" }}>{obj.recommended_answer}</p>
              </div>
            </div>
          ))}

          {filteredObjections.length === 0 && (
            <div style={{ gridColumn: "span 2", padding: "48px", textAlign: "center", color: "var(--color-text-muted)" }}>
              <HelpCircle size={48} style={{ margin: "0 auto 16px", color: "var(--color-border)" }} />
              <h3>Возражения не найдены</h3>
            </div>
          )}
        </div>
      )}

      {/* Script Modal */}
      {showScriptModal && (
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
              {editingScriptId ? "Редактировать скрипт звонка" : "Добавить скрипт звонка"}
            </h3>
            <form onSubmit={handleCreateScript} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Название скрипта</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={scriptTitle}
                  onChange={e => setScriptTitle(e.target.value)}
                  placeholder="Например: Дожим после пробного урока"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Этап продажи</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={scriptStage}
                  onChange={e => setScriptStage(e.target.value)}
                  placeholder="Например: Знакомство / Продажа / Напоминание"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Содержимое (Скрипт диалога)</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "150px", padding: "12px 16px", resize: "none" }}
                  value={scriptContent}
                  onChange={e => setScriptContent(e.target.value)}
                  placeholder="Приветствие: Здравствуйте! ...&#10;Суть звонка: ...&#10;Закрытие: ..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Чек-лист (каждое действие с новой строки)</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "100px", padding: "12px 16px", resize: "none" }}
                  value={scriptChecklistInput}
                  onChange={e => setScriptChecklistInput(e.target.value)}
                  placeholder="Озвучить имя родителя&#10;Сделать комплимент ребенку&#10;Назвать цену"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <Button 
                  type="button" 
                  variant="secondary-crm" 
                  onClick={() => { 
                    setShowScriptModal(false); 
                    setEditingScriptId(null); 
                    setScriptTitle(""); 
                    setScriptStage("Знакомство"); 
                    setScriptContent(""); 
                    setScriptChecklistInput(""); 
                  }}
                >
                  Отмена
                </Button>
                <Button type="submit" variant="primary-crm" disabled={submittingScript}>
                  {submittingScript ? "Сохранение..." : editingScriptId ? "Сохранить" : "Добавить"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Objection Modal */}
      {showObjectionModal && (
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
              {editingObjectionId ? "Редактировать возражение" : "Добавить возражение"}
            </h3>
            <form onSubmit={handleCreateObjection} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Формулировка возражения (клиент говорит...)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={objTitle}
                  onChange={e => setObjTitle(e.target.value)}
                  placeholder="Например: У нас нет времени"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Категория</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={objCategory}
                  onChange={e => setObjCategory(e.target.value)}
                  placeholder="Например: Время / Цена / Локация"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Рекомендованный ответ куратора</label>
                <textarea 
                  className="form-input" 
                  style={{ height: "120px", padding: "12px 16px", resize: "none" }}
                  value={objRecAnswer}
                  onChange={e => setObjRecAnswer(e.target.value)}
                  placeholder="Я согласен, время драгоценно... Но наши занятия..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Теги (через запятую)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={objTagsInput}
                  onChange={e => setObjTagsInput(e.target.value)}
                  placeholder="время, график, занятость"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <Button 
                  type="button" 
                  variant="secondary-crm" 
                  onClick={() => { 
                    setShowObjectionModal(false); 
                    setEditingObjectionId(null); 
                    setObjTitle(""); 
                    setObjCategory("Цена"); 
                    setObjRecAnswer(""); 
                    setObjTagsInput(""); 
                  }}
                >
                  Отмена
                </Button>
                <Button type="submit" variant="primary-crm" disabled={submittingObjection}>
                  {submittingObjection ? "Сохранение..." : editingObjectionId ? "Сохранить" : "Добавить"}
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
