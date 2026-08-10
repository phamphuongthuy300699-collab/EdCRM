"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Download, RefreshCw } from "lucide-react";

const rub = (value: unknown) => `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
const periods = ["Сегодня", "Неделя", "Месяц", "Прошлый месяц", "Произвольный диапазон"] as const;
type ReportTab = "overview" | "groups" | "teachers" | "attendance" | "debt";
type GroupSort = "occupancy" | "attendance" | "debits" | "students";

function rangeFor(period: string) {
  const now = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  if (period === "Сегодня") return [iso(now), iso(now)];
  if (period === "Неделя") { const start = new Date(now); start.setDate(now.getDate() - 6); return [iso(start), iso(now)]; }
  if (period === "Прошлый месяц") { const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); const end = new Date(now.getFullYear(), now.getMonth(), 0); return [iso(start), iso(end)]; }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return [iso(start), iso(now)];
}

export default function ReportsPage() {
  const initial = useMemo(() => rangeFor("Месяц"), []);
  const [period, setPeriod] = useState("Месяц");
  const [dateFrom, setDateFrom] = useState(initial[0]);
  const [dateTo, setDateTo] = useState(initial[1]);
  const [filters, setFilters] = useState({ branchId: "", courseId: "", groupId: "", teacherId: "" });
  const [tab, setTab] = useState<ReportTab>("overview");
  const [groupSort, setGroupSort] = useState<GroupSort>("occupancy");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
      const response = await fetch(`/api/crm/reports?${params}`);
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось построить отчёт");
      setData(payload);
    } catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  }, [dateFrom, dateTo, filters]);
  useEffect(() => { void load(); }, [load]);

  const choosePeriod = (value: string) => {
    setPeriod(value);
    if (value !== "Произвольный диапазон") {
      const [from, to] = rangeFor(value); setDateFrom(from); setDateTo(to);
    }
  };
  const exportUrl = (type: string) => `/api/crm/reports/export?${new URLSearchParams({ type, dateFrom, dateTo, ...filters })}`;
  const report = data?.report;
  const sortedGroupRows = useMemo(() => {
    const rows = [...(report?.groupRows || [])];
    const value = (row: any) => {
      if (groupSort === "attendance") return row.visits;
      if (groupSort === "debits") return row.lessonDebits;
      if (groupSort === "students") return row.students;
      return row.occupancyRate;
    };
    return rows.sort((left: any, right: any) => Number(value(right) || 0) - Number(value(left) || 0));
  }, [groupSort, report?.groupRows]);
  const directories = data?.directories || { branches: [], courses: [], groups: [], teachers: [] };
  const card = (title: string, value: string | number, detail: string) => <div className="card-crm" style={{ background: "white", minWidth: 0 }}><small style={{ color: "var(--color-text-muted)" }}>{title}</small><strong style={{ display: "block", fontSize: 24, margin: "5px 0" }}>{value}</strong><span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{detail}</span></div>;

  return <main style={{ padding: "clamp(18px,3vw,36px)", display: "grid", gap: 20, minWidth: 0 }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
      <div><span style={{ color: "var(--color-primary)", fontWeight: 800, fontSize: 12 }}>УПРАВЛЕНЧЕСКАЯ АНАЛИТИКА</span><h1 style={{ margin: "4px 0" }}>Отчёты</h1><p style={{ margin: 0, color: "var(--color-text-muted)" }}>Операционные показатели из первичных данных CRM</p></div>
      <button className="btn btn-secondary-site" onClick={() => void load()}><RefreshCw size={16}/> Обновить</button>
    </header>

    <section className="card-crm" style={{ background: "white", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>{periods.map((item) => <button key={item} className={`btn ${period === item ? "btn-primary-crm" : "btn-secondary-site"}`} onClick={() => choosePeriod(item)}>{item}</button>)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
        <label>С<input type="date" value={dateFrom} onChange={(event) => { setPeriod("Произвольный диапазон"); setDateFrom(event.target.value); }} style={{ display: "block", width: "100%" }}/></label>
        <label>По<input type="date" value={dateTo} onChange={(event) => { setPeriod("Произвольный диапазон"); setDateTo(event.target.value); }} style={{ display: "block", width: "100%" }}/></label>
        {(["branches","courses","groups","teachers"] as const).map((key, index) => <label key={key}>{["Филиал","Направление","Группа","Преподаватель"][index]}<select value={filters[(["branchId","courseId","groupId","teacherId"] as const)[index]]} onChange={(event) => setFilters((current) => ({ ...current, [(["branchId","courseId","groupId","teacherId"] as const)[index]]: event.target.value }))} style={{ display: "block", width: "100%", minHeight: 42 }}><option value="">Все</option>{directories[key].map((item: any) => <option key={item.id} value={item.id}>{item.name || item.title}</option>)}</select></label>)}
      </div>
    </section>

    <nav aria-label="Виды отчётов" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{([
      ["overview","Обзор"],["groups","По группам"],["teachers","По преподавателям"],["attendance","Посещаемость"],["debt","Задолженность"],
    ] as const).map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`btn ${tab === id ? "btn-primary-crm" : "btn-secondary-site"}`}><BarChart3 size={15}/>{label}</button>)}</nav>

    {error && <div role="alert" className="card-crm" style={{ background: "white", color: "var(--color-danger)" }}>{error}</div>}
    {loading && <div className="card-crm">Строим отчёт…</div>}
    {!loading && report && tab === "overview" && <>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
        {card("Активные ученики", report.students.active, `Без группы: ${report.students.withoutGroup} · новых: ${report.students.newInPeriod}`)}
        {card("Активные группы", report.groups.active, `Текущая заполненность: ${report.groups.occupancyRate}%`)}
        {card("Занятия", report.lessons.scheduled, `Проведено ${report.lessons.completed} · отменено ${report.lessons.cancelled} · переносы ${report.lessons.moved}`)}
        {card("Посещаемость", `${report.attendance.rate}%`, `${report.attendance.present} были · ${report.attendance.late} опоздали`)}
        {card("Получено оплат", rub(report.finance.cashReceived), `${report.finance.paidPayments} подтверждённых оплат`)}
        {card("Стоимость проведённых занятий", rub(report.finance.lessonDebits), "Источник: lesson_debit, не денежные поступления")}
        {card("Задолженность родителей", rub(report.finance.totalDebt), `${report.finance.debtors} лицевых счетов ниже нуля`)}
        {card("Начислено преподавателям", rub(report.payroll.accrued), `Одобрено ${rub(report.payroll.approved)} · к выплате ${rub(report.payroll.payable)}`)}
      </section>
      <details className="card-crm" style={{ background: "white" }}><summary style={{ cursor: "pointer", fontWeight: 700 }}>Источники и формулы</summary><ul>{Object.entries(report.sources).map(([key,value]) => <li key={key}><code>{key}</code>: {String(value)}</li>)}</ul></details>
    </>}

    {!loading && report && tab === "groups" && <>
      <label style={{ justifySelf: "start" }}>Сортировать группы<select value={groupSort} onChange={(event) => setGroupSort(event.target.value as GroupSort)} style={{ display: "block", minWidth: 240 }}><option value="occupancy">По заполненности</option><option value="attendance">По посещениям</option><option value="debits">По списаниям</option><option value="students">По числу учеников</option></select></label>
      <ReportTable headers={["Группа","Преподаватель","Ученики","Вместимость","Заполненность","Проведено","Посещения","Пропуски","Списано","Начислено"]} rows={sortedGroupRows.map((row: any) => [<Link key={row.id} href={`/crm/groups?groupId=${row.id}`}>{row.title}</Link>,row.teacher,row.students,row.capacity,`${row.occupancyRate}%`,row.completedLessons,row.visits,row.absences,rub(row.lessonDebits),rub(row.teacherPayroll)])} note="Заполненность рассчитана по текущей вместимости и активным зачислениям."/>
    </>}
    {!loading && report && tab === "teachers" && <><a className="btn btn-secondary-site" href={exportUrl("payroll")}><Download size={15}/> Скачать начисления CSV</a><ReportTable headers={["Преподаватель","Проведено","Фактических посещений","Среднее детей","Начислено","Одобрено","Выплачено","К выплате"]} rows={report.teacherRows.map((row: any) => [row.teacher,row.completedLessons,row.actualVisits,row.averageChildren,rub(row.accrued),rub(row.approved),rub(row.paid),rub(row.payable)])}/></>}
    {!loading && report && tab === "attendance" && <><a className="btn btn-secondary-site" href={exportUrl("attendance")}><Download size={15}/> Скачать посещаемость CSV</a><ReportTable headers={["Ученик","Группа","Занятий","Был","Опоздал","Уважительный пропуск","Без причины","Посещаемость"]} rows={report.attendanceRows.map((row: any) => [<Link key={`student-${row.studentId}`} href={`/crm/students/${row.studentId}`}>{row.student}</Link>,<Link key={`group-${row.groupId}`} href={`/crm/groups?groupId=${row.groupId}`}>{row.group}</Link>,row.lessons,row.present,row.late,row.absentExcused,row.absentUnexcused,`${row.rate}%`])}/></>}
    {!loading && report && tab === "debt" && <><a className="btn btn-secondary-site" href={exportUrl("debt")}><Download size={15}/> Скачать задолженность CSV</a><ReportTable headers={["Родитель","Дети","Баланс","Последняя оплата","Последнее списание"]} rows={report.debtRows.map((row: any) => [row.guardian,row.children,rub(row.balance),row.lastPayment ? new Date(row.lastPayment).toLocaleDateString("ru-RU") : "—",row.lastDebit ? new Date(row.lastDebit).toLocaleDateString("ru-RU") : "—"])}/></>}
  </main>;
}

function ReportTable({ headers, rows, note }: { headers: string[]; rows: any[][]; note?: string }) {
  return <section className="card-crm" style={{ background: "white", padding: 0, overflowX: "auto" }}>{note && <p style={{ margin: 0, padding: 14, color: "var(--color-text-muted)", fontSize: 12 }}>{note}</p>}<table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}><thead><tr>{headers.map((header) => <th key={header} style={{ textAlign: "left", padding: 12, borderBottom: "1px solid var(--color-border)" }}>{header}</th>)}</tr></thead><tbody>{rows.map((row,index) => <tr key={index}>{row.map((cell,cellIndex) => <td key={cellIndex} style={{ padding: 12, borderBottom: "1px solid var(--color-border)" }}>{cell}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <p style={{ padding: 20 }}>За выбранный период данных нет.</p>}</section>;
}
