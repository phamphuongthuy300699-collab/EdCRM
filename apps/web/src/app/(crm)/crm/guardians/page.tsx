"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@robotics-crm/ui";
import { Archive, CreditCard, Mail, MessageCircle, Phone, Plus, Search, ShieldCheck, UserCheck, Users } from "lucide-react";
import { CrmDialog } from "@/shared/ui/CrmDialog";

type GuardianRow = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  status: string;
  notes: string | null;
  source?: string | null;
  tags?: string[];
  interestNotes?: string | null;
  children: Array<{ id: string; fullName: string; relation: string | null; isPrimary: boolean; isBillingContact: boolean }>;
  childCount: number;
  portalStatus: "active" | "not_issued";
  maxStatus: "linked" | "not_linked";
  activeInvoiceCount: number;
  debtAmount: number;
  invoices: any[];
  payments: any[];
  lastPayment: any | null;
  duplicateReasons: string[];
  isPossibleDuplicate: boolean;
};

const filters = [
  { id: "all", label: "Все рабочие" },
  { id: "prospect", label: "Потенциальные" },
  { id: "active", label: "Активные" },
  { id: "inactive", label: "Неактивные" },
  { id: "do_not_contact", label: "Не связываться" },
  { id: "without_children", label: "Без детей" },
  { id: "debt", label: "С долгом" },
  { id: "no-email", label: "Без email" },
  { id: "portal-active", label: "ЛК активен" },
  { id: "portal-missing", label: "ЛК не выдан" },
  { id: "max-linked", label: "MAX привязан" },
  { id: "max-missing", label: "MAX не привязан" },
  { id: "duplicates", label: "Возможные дубликаты" },
  { id: "archived", label: "Архив" },
];

export default function CrmGuardiansPage() {
  const [guardians, setGuardians] = useState<GuardianRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<GuardianRow | null>(null);
  const [creating, setCreating] = useState(false);
  const emptyForm = { fullName: "", phone: "", email: "", notes: "", status: "prospect", source: "manual", tags: "", interestNotes: "" };
  const [form, setForm] = useState(emptyForm);
  const [duplicateCandidates,setDuplicateCandidates]=useState<any[]>([]);
  const [interactions,setInteractions]=useState<any[]>([]);
  const [interactionForm,setInteractionForm]=useState({type:"call",result:"answered",summary:"",nextActionAt:""});
  const [message, setMessage] = useState("");
  const [mergeMasterId, setMergeMasterId] = useState("");
  const [mergeDuplicateId, setMergeDuplicateId] = useState("");
  const [mergeConfirmation, setMergeConfirmation] = useState("");
  const [mergePreview, setMergePreview] = useState<Record<string, number> | null>(null);
  const [merging, setMerging] = useState(false);

  async function loadGuardians() {
    setLoading(true);
    try {
      const response = await fetch("/api/crm/guardians");
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось загрузить родителей");
      setGuardians(payload.guardians || []);
      const requestedGuardianId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("guardian") : null;
      if (requestedGuardianId) {
        const requested = (payload.guardians || []).find((guardian: GuardianRow) => guardian.id === requestedGuardianId);
        if (requested) setSelected(requested);
      }
    } catch (error: any) {
      setMessage(error.message || "Не удалось загрузить родителей");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGuardians();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setMergeMasterId(selected.id);
    setMergeDuplicateId("");
    setMergeConfirmation("");
    setMergePreview(null);
    setForm({
      fullName: selected.fullName || "",
      phone: selected.phone || "",
      email: selected.email || "",
      notes: selected.notes || "",
      status: selected.status === "archived" ? "archived" : selected.status || "active",
      source:selected.source||"manual",tags:(selected.tags||[]).join(", "),interestNotes:selected.interestNotes||"",
    });
    fetch(`/api/crm/interactions?guardianId=${selected.id}`).then(response=>response.json()).then(payload=>setInteractions(payload.ok?payload.interactions||[]:[]));
  }, [selected]);

  async function addInteraction(event:React.FormEvent){event.preventDefault();if(!selected)return;const response=await fetch("/api/crm/interactions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({guardianId:selected.id,type:interactionForm.type,result:interactionForm.result,summary:interactionForm.summary||null,nextActionAt:interactionForm.nextActionAt?new Date(interactionForm.nextActionAt).toISOString():null})});const payload=await response.json();if(!response.ok){setMessage(payload.error||"Не удалось добавить взаимодействие");return}setInteractions([payload.interaction,...interactions]);setInteractionForm({type:"call",result:"answered",summary:"",nextActionAt:""});setMessage("Взаимодействие сохранено")}

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guardians.filter((guardian) => {
      const haystack = [
        guardian.fullName,
        guardian.phone,
        guardian.email,
        ...guardian.children.map((child) => child.fullName),
      ].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesFilter =
        filter === "all" ? guardian.status !== "archived" :
        filter === "prospect" ? guardian.status === "prospect" :
        filter === "active" ? guardian.status === "active" :
        filter === "inactive" ? guardian.status === "inactive" :
        filter === "do_not_contact" ? guardian.status === "do_not_contact" :
        filter === "without_children" ? guardian.childCount === 0 && guardian.status !== "archived" :
        filter === "debt" ? guardian.debtAmount > 0 :
        filter === "no-email" ? !guardian.email :
        filter === "portal-active" ? guardian.portalStatus === "active" :
        filter === "portal-missing" ? guardian.portalStatus !== "active" :
        filter === "max-linked" ? guardian.maxStatus === "linked" :
        filter === "max-missing" ? guardian.maxStatus !== "linked" :
        filter === "duplicates" ? guardian.isPossibleDuplicate :
        filter === "archived" ? guardian.status === "archived" :
        true;
      return matchesSearch && matchesFilter;
    });
  }, [guardians, search, filter]);

  async function saveGuardian(event: React.FormEvent) {
    event.preventDefault();
    if (!selected && !creating) return;
    setMessage("");
    const response = await fetch("/api/crm/guardians", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: selected?.id, ...form, tags:form.tags.split(",").map(value=>value.trim()).filter(Boolean) }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      if(payload.code==="DUPLICATE_GUARDIAN_FOUND")setDuplicateCandidates(payload.candidates||[]);
      setMessage(payload.error || "Не удалось сохранить родителя");
      return;
    }
    const warning = payload.warnings?.length ? ` Найдены похожие родители: ${payload.warnings.map((item: any) => item.fullName).join(", ")}` : "";
    setMessage(`Родитель сохранён.${warning}`);
    setCreating(false);setDuplicateCandidates([]);setForm(emptyForm);
    await loadGuardians();
  }

  async function mergeGuardians() {
    if (!mergeMasterId || !mergeDuplicateId) {
      setMessage("Выберите master guardian и duplicate guardian");
      return;
    }
    if (mergeMasterId === mergeDuplicateId) {
      setMessage("Master и duplicate должны быть разными");
      return;
    }
    setMerging(true);
    setMessage("");
    try {
      const response = await fetch("/api/crm/guardians/merge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ masterGuardianId: mergeMasterId, duplicateGuardianId: mergeDuplicateId, confirmation: mergeConfirmation }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось объединить родителей");
      setMessage("Родители объединены. Дубль архивирован, связи перенесены.");
      setSelected(null);
      await loadGuardians();
    } catch (error: any) {
      setMessage(error.message || "Не удалось объединить родителей");
    } finally {
      setMerging(false);
    }
  }

  async function loadMergePreview(duplicateId: string) {
    setMergeDuplicateId(duplicateId);
    setMergePreview(null);
    if (!mergeMasterId || !duplicateId) return;
    const response = await fetch("/api/crm/guardians/merge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ masterGuardianId: mergeMasterId, duplicateGuardianId: duplicateId, previewOnly: true }),
    });
    const payload = await response.json();
    if (payload.ok) setMergePreview(payload.preview || {});
  }

  function duplicateReasonLabel(reason: string) {
    switch (reason) {
      case "same_phone_normalized": return "телефон";
      case "same_email_normalized": return "email";
      case "same_name_phone": return "ФИО + телефон";
      case "same_name_children": return "ФИО + дети";
      default: return reason;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)" }}>Родители</h1>
          <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)", fontSize: "var(--font-small)" }}>
            Единая карточка родителя: дети, ЛК, MAX, счета и платежи.
          </p>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}><Button variant="primary-crm" onClick={()=>{setForm(emptyForm);setCreating(true);setDuplicateCandidates([])}}><Plus size={16}/> Добавить родителя</Button><div className="card-crm" style={{ background: "#fff", padding: "12px 16px", minWidth: 180 }}>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 700 }}>Задолженность</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{guardians.reduce((sum, item) => sum + item.debtAmount, 0).toLocaleString("ru-RU")} ₽</div>
        </div></div>
      </div>

      {message && (
        <div className="card-crm" style={{ background: "#fff", padding: 14, color: message.includes("Не удалось") ? "var(--color-danger)" : "var(--color-primary-dark)" }}>
          {message}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 320 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--color-text-muted)" }} />
          <input className="form-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по родителю, телефону, email, ребёнку" style={{ paddingLeft: 38 }} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {filters.map((item) => (
            <button key={item.id} onClick={() => setFilter(item.id)} style={{
              border: "1px solid var(--color-border)",
              background: filter === item.id ? "var(--color-primary-soft)" : "#fff",
              color: filter === item.id ? "var(--color-primary-dark)" : "var(--color-text-muted)",
              borderRadius: 8,
              padding: "8px 10px",
              fontWeight: 700,
              cursor: "pointer",
            }}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-crm" style={{ background: "#fff", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)", textAlign: "left" }}>
              <th style={{ padding: 14 }}>ФИО</th>
              <th style={{ padding: 14 }}>Контакты</th>
              <th style={{ padding: 14 }}>Дети</th>
              <th style={{ padding: 14 }}>ЛК / MAX</th>
              <th style={{ padding: 14 }}>Счета</th>
              <th style={{ padding: 14 }}>Статус</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: "center" }}>Загрузка...</td></tr>
            ) : filtered.map((guardian) => (
              <tr key={guardian.id} onClick={() => setSelected(guardian)} style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer" }}>
                <td style={{ padding: 14, fontWeight: 800 }}>{guardian.fullName}</td>
                <td style={{ padding: 14, color: "var(--color-text-muted)" }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <span><Phone size={13} /> {guardian.phone || "нет телефона"}</span>
                    <span><Mail size={13} /> {guardian.email || "нет email"}</span>
                  </div>
                </td>
                <td style={{ padding: 14 }}>
                  <div style={{ fontWeight: 800 }}>{guardian.childCount}</div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{guardian.children.map((child) => child.fullName).join(", ") || "Нет связей"}</div>
                </td>
                <td style={{ padding: 14 }}>
                  <span className={guardian.portalStatus === "active" ? "badge badge-green" : "badge badge-gray"}><UserCheck size={12} /> {guardian.portalStatus === "active" ? "ЛК активен" : "ЛК не выдан"}</span>
                  <div style={{ height: 6 }} />
                  <span className={guardian.maxStatus === "linked" ? "badge badge-blue" : "badge badge-gray"}><MessageCircle size={12} /> {guardian.maxStatus === "linked" ? "MAX привязан" : "MAX нет"}</span>
                </td>
                <td style={{ padding: 14 }}>
                  <div style={{ fontWeight: 900 }}>{guardian.activeInvoiceCount}</div>
                  <div style={{ color: guardian.debtAmount > 0 ? "var(--color-danger)" : "var(--color-text-muted)", fontWeight: 800 }}>{guardian.debtAmount.toLocaleString("ru-RU")} ₽</div>
                </td>
                <td style={{ padding: 14 }}>
                  <span className={guardian.status === "archived" ? "badge badge-gray" : guardian.status === "do_not_contact" ? "badge badge-red" : "badge badge-green"}>{guardian.status === "prospect"?"Потенциальный":guardian.status === "inactive"?"Неактивный":guardian.status === "do_not_contact"?"Не связываться":guardian.status === "archived" ? "Архив" : "Активен"}</span>
                  {guardian.isPossibleDuplicate && <div style={{ marginTop: 6 }}><span className="badge badge-amber">дубль</span></div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && <CrmDialog title="Добавить родителя" description="Ребёнка можно привязать позже" onClose={()=>setCreating(false)} width={560}>
        <form onSubmit={saveGuardian} style={{display:"grid",gap:12}}>
          <input className="form-input" required placeholder="ФИО *" value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><input className="form-input" placeholder="Телефон" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><input className="form-input" type="email" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
          <select className="form-input" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="prospect">Потенциальный</option><option value="active">Активный</option><option value="inactive">Неактивный</option><option value="do_not_contact">Не связываться</option></select>
          <select className="form-input" value={form.source} onChange={e=>setForm({...form,source:e.target.value})}><option value="site">Сайт</option><option value="call">Звонок</option><option value="referral">Рекомендация</option><option value="social">Соцсети</option><option value="event">Мероприятие</option><option value="manual">Вручную</option><option value="other">Другое</option></select>
          <input className="form-input" placeholder="Теги через запятую" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}/><textarea className="form-input" rows={3} placeholder="Интерес / комментарий" value={form.interestNotes} onChange={e=>setForm({...form,interestNotes:e.target.value})}/>
          {duplicateCandidates.length>0&&<div className="card-crm" style={{padding:12,background:"#FFFBEB"}}><strong>Найден похожий родитель</strong>{duplicateCandidates.map(item=><button key={item.id} type="button" onClick={()=>{setCreating(false);setSelected(guardians.find(g=>g.id===item.id)||null)}} style={{display:"block",marginTop:8}}>Открыть {item.fullName}</button>)}<Button type="button" variant="secondary-crm" onClick={async()=>{const response=await fetch("/api/crm/guardians",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...form,tags:form.tags.split(",").map(v=>v.trim()).filter(Boolean),allowDuplicate:true})});if(response.ok){setCreating(false);await loadGuardians()}}}>Создать отдельную карточку</Button></div>}
          <div className="crm-dialog-actions"><Button type="button" variant="secondary-crm" onClick={()=>setCreating(false)}>Отмена</Button><Button type="submit" variant="primary-crm">Сохранить</Button></div>
        </form>
      </CrmDialog>}

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.34)", zIndex: 60, display: "flex", justifyContent: "flex-end" }} onClick={() => setSelected(null)}>
          <aside onClick={(event) => event.stopPropagation()} style={{ width: 520, maxWidth: "100%", background: "#fff", height: "100%", overflow: "auto", padding: 24, boxShadow: "-20px 0 60px rgba(0,0,0,.14)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>{selected.fullName}</h2>
                <p style={{ margin: "6px 0 0", color: "var(--color-text-muted)" }}>Карточка родителя и связанные сущности</p>
              </div>
              <Button variant="secondary-site" onClick={() => setSelected(null)}>Закрыть</Button>
            </div>

            <form onSubmit={saveGuardian} style={{ marginTop: 24, display: "grid", gap: 12 }}>
              <input className="form-input" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="ФИО" required />
              <input className="form-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Телефон" />
              <input className="form-input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" />
              <textarea className="form-input" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Заметки" rows={3} />
              <Button type="submit" variant="primary-crm">Сохранить контакты</Button>
            </form>

            <section style={{ marginTop: 28, display: "grid", gap: 14 }}>
              <h3 style={{ margin: 0 }}><Users size={16} /> Связанные дети</h3>
              {selected.children.map((child) => (
                <div key={child.id} className="card-crm" style={{ padding: 14, background: "var(--color-bg)" }}>
                  <strong>{child.fullName}</strong>
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                    {child.relation || "Родитель"} · {child.isPrimary ? "основной" : "дополнительный"} · {child.isBillingContact ? "получатель счетов" : "не плательщик"}
                  </div>
                </div>
              ))}
            </section>
            {selected.childCount===0&&<div className="card-crm" style={{marginTop:16,padding:14,background:"#FFFBEB"}}>ЛК родителя станет доступен после привязки ребёнка.</div>}
            <section style={{marginTop:28,display:"grid",gap:12}}><h3 style={{margin:0}}>Работа с клиентом</h3><form onSubmit={addInteraction} style={{display:"grid",gap:10}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><select className="form-input" value={interactionForm.type} onChange={e=>setInteractionForm({...interactionForm,type:e.target.value})}><option value="call">Звонок</option><option value="message">Сообщение</option><option value="email">Email</option><option value="max">MAX</option><option value="comment">Заметка</option></select><select className="form-input" value={interactionForm.result} onChange={e=>setInteractionForm({...interactionForm,result:e.target.value})}><option value="answered">Ответил</option><option value="no_answer">Не дозвонились</option><option value="interested">Интересуется</option><option value="thinking">Думает</option><option value="rejected">Отказ</option></select></div><textarea className="form-input" value={interactionForm.summary} onChange={e=>setInteractionForm({...interactionForm,summary:e.target.value})} placeholder="Итог / заметка"/><label style={{fontSize:13,fontWeight:700}}>Следующий контакт<input className="form-input" type="datetime-local" value={interactionForm.nextActionAt} onChange={e=>setInteractionForm({...interactionForm,nextActionAt:e.target.value})}/></label><Button type="submit" variant="primary-crm">Добавить взаимодействие</Button></form>{interactions.map(item=><div key={item.id} className="card-crm" style={{padding:12,background:"var(--color-bg)"}}><strong>{item.type} · {item.result||"без результата"}</strong><p style={{margin:"4px 0"}}>{item.summary||"—"}</p><small>{new Date(item.created_at).toLocaleString("ru-RU")}{item.next_action_at?` · следующий: ${new Date(item.next_action_at).toLocaleString("ru-RU")}`:""}</small></div>)}</section>

            <section style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="card-crm" style={{ padding: 14, background: "var(--color-bg)" }}><Users size={16} /> Детей: {selected.childCount}</div>
              <div className="card-crm" style={{ padding: 14, background: "var(--color-bg)" }}><ShieldCheck size={16} /> ЛК: {selected.portalStatus === "active" ? "активен" : "не выдан"}</div>
              <div className="card-crm" style={{ padding: 14, background: "var(--color-bg)" }}><MessageCircle size={16} /> MAX: {selected.maxStatus === "linked" ? "привязан" : "не привязан"}</div>
              <div className="card-crm" style={{ padding: 14, background: "var(--color-bg)" }}><CreditCard size={16} /> Активных счетов: {selected.activeInvoiceCount}</div>
              <div className="card-crm" style={{ padding: 14, background: "var(--color-bg)" }}><CreditCard size={16} /> Долг: {selected.debtAmount.toLocaleString("ru-RU")} ₽</div>
              <div className="card-crm" style={{ padding: 14, background: "var(--color-bg)" }}><CreditCard size={16} /> Последний платёж: {selected.lastPayment?.paid_at ? new Date(selected.lastPayment.paid_at).toLocaleDateString("ru-RU") : "нет"}</div>
              <div className="card-crm" style={{ padding: 14, background: "var(--color-bg)" }}><Archive size={16} /> Статус: {selected.status === "archived" ? "архив" : "активен"}</div>
            </section>

            {selected.isPossibleDuplicate && (
              <section style={{ marginTop: 28, display: "grid", gap: 12 }}>
                <h3 style={{ margin: 0 }}>Возможный дубль</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selected.duplicateReasons.map((reason) => <span key={reason} className="badge badge-amber">{duplicateReasonLabel(reason)}</span>)}
                </div>
                <div className="card-crm" style={{ padding: 14, background: "var(--color-bg)", display: "grid", gap: 10 }}>
                  <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                    Master guardian
                    <select className="form-input" value={mergeMasterId} onChange={(event) => setMergeMasterId(event.target.value)}>
                      {guardians.filter((guardian) => guardian.status !== "archived").map((guardian) => (
                        <option key={guardian.id} value={guardian.id}>{guardian.fullName} · {guardian.phone || guardian.email || guardian.id}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
                    Duplicate guardian
                    <select className="form-input" value={mergeDuplicateId} onChange={(event) => loadMergePreview(event.target.value)}>
                      <option value="">Выберите дубль для переноса</option>
                      {guardians.filter((guardian) => guardian.id !== mergeMasterId && guardian.status !== "archived" && guardian.isPossibleDuplicate).map((guardian) => (
                        <option key={guardian.id} value={guardian.id}>{guardian.fullName} · {guardian.phone || guardian.email || guardian.id}</option>
                      ))}
                    </select>
                  </label>
                  {mergeMasterId && mergeDuplicateId && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div><strong>Master</strong><br />{guardians.find((guardian) => guardian.id === mergeMasterId)?.fullName}</div>
                      <div><strong>Duplicate</strong><br />{guardians.find((guardian) => guardian.id === mergeDuplicateId)?.fullName}</div>
                    </div>
                  )}
                  {mergePreview && (
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      Будет перенесено: {Object.entries(mergePreview).map(([key, value]) => `${key}: ${value}`).join(", ")}
                    </div>
                  )}
                  <input className="form-input" value={mergeConfirmation} onChange={(event) => setMergeConfirmation(event.target.value)} placeholder="Введите ОБЪЕДИНИТЬ" />
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)" }}>Пустые телефон/email master будут заполнены из duplicate, существующие значения master сохраняются.</p>
                  <Button type="button" variant="primary-crm" onClick={mergeGuardians} disabled={merging || mergeConfirmation !== "ОБЪЕДИНИТЬ"}>
                    {merging ? "Объединяем..." : "Объединить безопасно"}
                  </Button>
                </div>
              </section>
            )}

            <section style={{ marginTop: 28 }}>
              <h3 style={{ margin: "0 0 12px" }}>Аудит</h3>
              <p style={{ color: "var(--color-text-muted)", margin: 0 }}>Изменения ЛК и жизненного цикла пишутся в общий CRM audit log. Для контактных правок показано текущее состояние карточки.</p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
