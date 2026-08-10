"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, Coins, Download, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { Button } from "@robotics-crm/ui";
import { CrmDialog } from "@/shared/ui/CrmDialog";

type Tab = "accounts" | "payroll" | "warnings" | "reconciliation";
const rub = (value: unknown) => `${Number(value || 0).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
const related = (value: any) => Array.isArray(value) ? value[0] : value;
const monthStart = () => `${new Date().toISOString().slice(0, 7)}-01`;

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState(monthStart());
  const [warningType, setWarningType] = useState("");
  const [data, setData] = useState<any>({ items: [], total: 0, hasMore: false, canManage: false, summary: null });
  const [selected, setSelected] = useState<any>(null);
  const [ledger, setLedger] = useState<any>({ items: [], page: 1, hasMore: false });
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ view: tab, page: String(page), pageSize: "25" });
      if (tab === "accounts" && query.trim()) params.set("q", query.trim());
      if (tab === "payroll") { params.set("month", month); params.set("dateFrom", month); const end = new Date(`${month}T00:00:00Z`); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0); params.set("dateTo", end.toISOString().slice(0, 10)); }
      if (tab === "warnings" && warningType) params.set("warningType", warningType);
      const response = await fetch(`/api/crm/finance?${params}`);
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось загрузить финансы");
      setData(payload);
    } catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  }, [tab, page, query, month, warningType]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), tab === "accounts" ? 250 : 0); return () => window.clearTimeout(timer); }, [load, tab]);
  useEffect(() => { setPage(1); }, [tab, query, month, warningType]);

  const loadLedger = async (account: any, nextPage = 1) => {
    setSelected(account);
    const response = await fetch(`/api/crm/finance?view=ledger&accountId=${account.id}&page=${nextPage}&pageSize=25`);
    const payload = await response.json();
    if (!response.ok || !payload.ok) { setError(payload.error || "Не удалось загрузить операции"); return; }
    setLedger((current: any) => ({ ...payload, items: nextPage === 1 ? payload.items : [...current.items, ...payload.items] }));
  };
  const post = async (body: any, endpoint = "/api/crm/finance") => {
    setSaving(true); setError("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Операция не выполнена");
      setAmount(""); setReason(""); setSelectedPayments([]);
      await load();
      if (selected) await loadLedger(selected);
    } catch (cause) { setError((cause as Error).message); }
    finally { setSaving(false); }
  };

  const tabs = [
    { id: "accounts", label: "Лицевые счета", icon: Users },
    { id: "payroll", label: "Начисления преподавателям", icon: Coins },
    { id: "warnings", label: "Проблемы", icon: AlertTriangle },
    { id: "reconciliation", label: "Сверка", icon: ShieldCheck },
  ] as const;
  const totalBalance = useMemo(() => tab === "accounts" ? data.items.reduce((sum: number, account: any) => sum + Number(account.balance || 0), 0) : 0, [data.items, tab]);

  return <main style={{ padding: "clamp(18px,3vw,36px)", display: "grid", gap: 20, minWidth: 0 }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
      <div><span style={{ color: "var(--color-primary)", fontWeight: 800, fontSize: 12 }}>ФИНАНСОВЫЙ КОНТУР</span><h1 style={{ margin: "4px 0" }}>Финансы</h1><p style={{ margin: 0, color: "var(--color-text-muted)" }}>Лицевые счета, безопасная сверка и начисления преподавателям</p></div>
      {tab === "accounts" && <div className="card-crm" style={{ background: "white", padding: "11px 17px" }}><small>На текущей странице</small><strong style={{ display: "block", color: totalBalance < 0 ? "var(--color-danger)" : "var(--color-success)" }}>{rub(totalBalance)}</strong></div>}
    </header>
    <nav aria-label="Разделы финансов" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className={`btn ${tab === item.id ? "btn-primary-crm" : "btn-secondary-site"}`}><Icon size={16}/>{item.label}</button>; })}</nav>
    {error && <div role="alert" className="card-crm" style={{ background: "white", color: "var(--color-danger)" }}>{error}</div>}

    {tab === "accounts" && <section style={{ display: "grid", gap: 12 }}>
      <label style={{ position: "relative", maxWidth: 520 }}><Search size={17} style={{ position: "absolute", left: 13, top: 13 }}/><input aria-label="Поиск лицевых счетов" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Родитель, ребёнок или телефон" style={{ width: "100%", minHeight: 44, paddingLeft: 40 }}/></label>
      <div className="card-crm" style={{ background: "white", padding: 0, overflow: "hidden" }}>{!loading && data.items.length === 0 ? <p style={{ padding: 20 }}>Лицевые счета не найдены.</p> : data.items.map((account: any) => { const guardian = related(account.guardians); const children = (guardian?.student_guardians || []).map((link: any) => related(link.students)?.full_name).filter(Boolean).join(", "); return <button key={account.id} onClick={() => void loadLedger(account)} style={{ width: "100%", border: 0, borderBottom: "1px solid var(--color-border)", background: "white", padding: "14px 18px", display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 12, textAlign: "left", alignItems: "center" }}><span><strong style={{ display: "block" }}>{guardian?.full_name || "Родитель"}</strong><small>{children || guardian?.phone || "Дети не привязаны"}</small></span><strong style={{ color: Number(account.balance) < 0 ? "var(--color-danger)" : "var(--color-success)" }}>{rub(account.balance)}</strong><ChevronRight size={17}/></button>; })}</div>
    </section>}

    {tab === "payroll" && <section style={{ display: "grid", gap: 12 }}>
      <label style={{ maxWidth: 220 }}>Месяц<input type="month" value={month.slice(0,7)} onChange={(event) => setMonth(`${event.target.value}-01`)} style={{ display: "block", width: "100%" }}/></label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(245px,1fr))", gap: 10 }}>{(data.summary || []).map((summary: any) => <article key={summary.teacherId} className="card-crm" style={{ background: "white" }}><strong>{summary.teacherName}</strong><p style={{ fontSize: 13, lineHeight: 1.7 }}>Начислено: {rub(summary.accrued)}<br/>Одобрено: {rub(summary.approved)}<br/>К выплате: {rub(summary.payable)}<br/>Выплачено: {rub(summary.paid)}</p>{data.canManage && <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><Button disabled={saving} variant="secondary-site" onClick={() => void post({ action: "payrollPeriod", teacherId: summary.teacherId, month, status: "approved" })}>Одобрить все начисления</Button><Button disabled={saving} variant="secondary-site" onClick={() => void post({ action: "payrollPeriod", teacherId: summary.teacherId, month, status: "paid" })}>Отметить одобренные выплаченными</Button></div>}</article>)}</div>
      <a className="btn btn-secondary-site" href={`/api/crm/reports/export?type=payroll&dateFrom=${month}&dateTo=${month.slice(0,8)}31`}><Download size={15}/> Скачать CSV</a>
      <Table headers={["Преподаватель / занятие","Посетили","Ставка","Сумма","Статус"]} rows={data.items.map((entry: any) => { const lesson = related(entry.lesson_sessions); return [<span key={entry.id}><strong>{related(entry.profiles)?.full_name || "Преподаватель"}</strong><small style={{ display: "block" }}>{related(lesson?.groups)?.title} · {lesson?.lesson_date}</small></span>,entry.attendee_count,rub(entry.rate_snapshot),rub(entry.amount),entry.status]; })}/>
    </section>}

    {tab === "warnings" && <section style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{[["","Все"],["missing_billing_contact","Плательщик"],["missing_lesson_price","Цена занятия"],["missing_teacher_rate","Ставка преподавателя"]].map(([value,label]) => <button key={value} onClick={() => setWarningType(value)} className={`btn ${warningType === value ? "btn-primary-crm" : "btn-secondary-site"}`}>{label}</button>)}</div>
      {!loading && data.items.length === 0 && <div className="card-crm" style={{ background: "white", color: "var(--color-success)" }}>Открытых финансовых проблем нет.</div>}
      {data.items.map((problem: any) => { const lesson = related(problem.lesson_sessions); const group = related(lesson?.groups); const action = problem.warning_type === "missing_billing_contact" ? { label: "Назначить плательщика", href: `/crm/students/${problem.student_id}` } : problem.warning_type === "missing_lesson_price" ? { label: "Настроить стоимость группы", href: `/crm/groups?groupId=${lesson?.group_id || problem.details?.groupId}` } : { label: "Настроить ставку", href: `/crm/settings?teacherId=${problem.teacher_id}` }; return <article key={problem.id} className="card-crm" style={{ background: "white", display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 12 }}><AlertTriangle size={20} style={{ color: "var(--color-warning)" }}/><div><strong>{problem.warning_type === "missing_billing_contact" ? "Не выбран плательщик" : problem.warning_type === "missing_lesson_price" ? "Не задана цена занятия" : "Не задана ставка преподавателя"}</strong><p style={{ margin: "5px 0 10px", fontSize: 13 }}>{group?.title || "Занятие"} · {lesson?.lesson_date || ""}</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Link className="btn btn-secondary-site" href={action.href}>{action.label}</Link>{problem.warning_type !== "missing_teacher_rate" && data.canManage && <Button disabled={saving} variant="primary-crm" onClick={() => void post({ action: "lesson", lessonSessionId: problem.lesson_session_id }, "/api/crm/finance/reconcile")}>Повторить финансовую обработку</Button>}</div></div></article>; })}
    </section>}

    {tab === "reconciliation" && <section style={{ display: "grid", gap: 12 }}>
      <div className="card-crm" style={{ background: "var(--color-warning-soft)", borderColor: "var(--color-warning)" }}><strong>Исторические оплаты и начальный остаток нельзя учитывать дважды</strong><p style={{ marginBottom: 0 }}>Выберите один способ запуска: зачислите конкретные исторические оплаты либо задайте начальный остаток через лицевой счёт с причиной «Начальный остаток при запуске CRM».</p></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>{[["Оплаченных платежей до ledger",data.summary?.paidCount],["Сумма",rub(data.summary?.paidAmount)],["Уже отражено",data.summary?.reflectedCount],["Не отражено",data.summary?.unreflectedCount]].map(([label,value]) => <div key={String(label)} className="card-crm" style={{ background: "white" }}><small>{label}</small><strong style={{ display: "block", fontSize: 22 }}>{value}</strong></div>)}</div>
      <div className="card-crm" style={{ background: "white", padding: 0 }}>{data.items.map((payment: any) => <label key={payment.id} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 12, padding: 14, borderBottom: "1px solid var(--color-border)" }}><input type="checkbox" disabled={payment.reflected} checked={selectedPayments.includes(payment.id)} onChange={(event) => setSelectedPayments((current) => event.target.checked ? [...current,payment.id] : current.filter((id) => id !== payment.id))}/><span><strong>{related(payment.invoices)?.number || "Оплата"}</strong><small style={{ display: "block" }}>{related(payment.guardians)?.full_name || payment.provider}</small></span><span>{rub(payment.amount)} · {payment.reflected ? "учтено" : "не учтено"}</span></label>)}</div>
      {data.canManage && <Button disabled={saving || selectedPayments.length === 0} variant="primary-crm" onClick={() => void post({ action: "payments", paymentIds: selectedPayments }, "/api/crm/finance/reconcile")}>Зачислить выбранные исторические оплаты</Button>}
    </section>}

    <Pagination page={page} hasMore={data.hasMore} total={data.total} onPage={setPage}/>
    {selected && <CrmDialog title={related(selected.guardians)?.full_name || "Лицевой счёт"} description={`Баланс: ${rub(selected.balance)}`} variant="drawer" width={560} onClose={() => setSelected(null)}><div style={{ display: "grid", gap: 16 }}><a className="btn btn-secondary-site" href={`/api/crm/finance/export?type=ledger&accountId=${selected.id}`}><Download size={15}/> Скачать движения CSV</a><section><h3>История операций</h3>{ledger.items.map((entry: any) => <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}><span><strong>{entry.reason || entry.entry_type}</strong><small style={{ display: "block" }}>{new Date(entry.created_at).toLocaleString("ru-RU")}</small></span><strong>{rub(entry.amount)}</strong></div>)}{ledger.hasMore && <button className="btn btn-secondary-site" onClick={() => void loadLedger(selected, ledger.page + 1)}>Показать ещё</button>}</section>{data.canManage && <section className="card-crm" style={{ background: "var(--color-bg)" }}><h3>Ручная корректировка / начальный остаток</h3><p style={{ fontSize: 12 }}>Для запуска CRM используйте обязательную причину «Начальный остаток при запуске CRM». Не учитывайте одновременно те же исторические оплаты.</p><label>Сумма<input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} style={{ display: "block", width: "100%" }}/></label><label>Причина корректировки<textarea value={reason} onChange={(event) => setReason(event.target.value)} style={{ display: "block", width: "100%" }}/></label><Button disabled={saving || !amount || reason.trim().length < 3} variant="primary-crm" onClick={() => void post({ action: "adjust", guardianId: selected.guardian_id, amount: Number(amount), reason })}>Задать начальный остаток / добавить операцию</Button></section>}</div></CrmDialog>}
  </main>;
}

function Pagination({ page, hasMore, total, onPage }: { page: number; hasMore: boolean; total: number; onPage: (page: number) => void }) { return <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}><small>Всего: {total}</small><div style={{ display: "flex", gap: 8 }}><button disabled={page <= 1} className="btn btn-secondary-site" onClick={() => onPage(page - 1)}>Назад</button><button disabled={!hasMore} className="btn btn-secondary-site" onClick={() => onPage(page + 1)}>Показать ещё</button></div></div>; }
function Table({ headers, rows }: { headers: string[]; rows: any[][] }) { return <div className="card-crm" style={{ background: "white", padding: 0, overflowX: "auto" }}><table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}><thead><tr>{headers.map((header) => <th key={header} style={{ textAlign: "left", padding: 12, borderBottom: "1px solid var(--color-border)" }}>{header}</th>)}</tr></thead><tbody>{rows.map((row,index) => <tr key={index}>{row.map((cell,cellIndex) => <td key={cellIndex} style={{ padding: 12, borderBottom: "1px solid var(--color-border)" }}>{cell}</td>)}</tr>)}</tbody></table></div>; }
