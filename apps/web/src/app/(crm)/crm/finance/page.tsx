"use client";

import { Button } from "@robotics-crm/ui";
import {
  AlertTriangle,
  ChevronRight,
  Coins,
  Search,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CrmDialog } from "@/shared/ui/CrmDialog";

type Tab = "accounts" | "payroll" | "problems";
const rub = (value: unknown) =>
  `${Number(value || 0).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
const related = (value: any) => (Array.isArray(value) ? value[0] : value);

export default function FinancePage() {
  const [tab, setTab] = useState<Tab>("accounts");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<any>({
    canManage: false,
    accounts: [],
    payroll: [],
    problems: [],
    ledger: [],
  });
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (accountId?: string) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (accountId) params.set("accountId", accountId);
        const response = await fetch(`/api/crm/finance?${params}`);
        const payload = await response.json();
        if (!response.ok || !payload.ok)
          throw new Error(payload.error || "Не удалось загрузить финансы");
        setData(payload);
      } catch (cause) {
        setError((cause as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const openAccount = async (account: any) => {
    setSelected(account);
    await load(account.id);
  };
  const post = async (body: any) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/crm/finance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok)
        throw new Error(payload.error || "Операция не выполнена");
      if (
        body.action === "adjust" &&
        selected &&
        payload.result?.balance != null
      )
        setSelected({ ...selected, balance: payload.result.balance });
      await load(selected?.id);
      setAmount("");
      setReason("");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const total = useMemo(
    () =>
      data.accounts.reduce(
        (sum: number, account: any) => sum + Number(account.balance || 0),
        0,
      ),
    [data.accounts],
  );

  return (
    <main
      style={{
        padding: "clamp(18px, 3vw, 36px)",
        display: "grid",
        gap: 22,
        minWidth: 0,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "end",
        }}
      >
        <div>
          <span
            style={{
              color: "var(--color-primary)",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            ФИНАНСОВЫЙ КОНТУР
          </span>
          <h1 style={{ margin: "4px 0", fontSize: 30 }}>Финансы</h1>
          <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
            Баланс родителей, списания за занятия и начисления преподавателям
          </p>
        </div>
        <div
          className="card-crm"
          style={{ padding: "12px 18px", background: "white" }}
        >
          <small>Суммарный баланс</small>
          <strong
            style={{
              display: "block",
              fontSize: 20,
              color: total < 0 ? "var(--color-danger)" : "var(--color-success)",
            }}
          >
            {rub(total)}
          </strong>
        </div>
      </header>
      <nav
        aria-label="Разделы финансов"
        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
      >
        {(
          [
            { id: "accounts", label: "Лицевые счета", icon: Users },
            { id: "payroll", label: "Начисления преподавателям", icon: Coins },
            {
              id: "problems",
              label: `Проблемы${data.problems.length ? ` · ${data.problems.length}` : ""}`,
              icon: AlertTriangle,
            },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`btn ${tab === item.id ? "btn-primary-crm" : "btn-secondary-site"}`}
              style={{ minHeight: 42 }}
            >
              <Icon size={16} /> {item.label}
            </button>
          );
        })}
      </nav>
      {error && (
        <div
          role="alert"
          className="card-crm"
          style={{
            borderColor: "var(--color-danger)",
            color: "var(--color-danger)",
            background: "white",
          }}
        >
          {error}
        </div>
      )}
      {tab === "accounts" && (
        <section style={{ display: "grid", gap: 12 }}>
          <label style={{ position: "relative", maxWidth: 520 }}>
            <Search
              size={17}
              style={{
                position: "absolute",
                left: 13,
                top: 13,
                color: "var(--color-text-muted)",
              }}
            />
            <input
              aria-label="Поиск лицевых счетов"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Родитель, ребёнок или телефон"
              style={{
                width: "100%",
                minHeight: 44,
                padding: "8px 12px 8px 40px",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
              }}
            />
          </label>
          <div
            className="card-crm"
            style={{ background: "white", padding: 0, overflow: "hidden" }}
          >
            {loading ? (
              <p style={{ padding: 20 }}>Загрузка…</p>
            ) : data.accounts.length === 0 ? (
              <p style={{ padding: 20, color: "var(--color-text-muted)" }}>
                Лицевые счета появятся после первой оплаты, списания или
                корректировки.
              </p>
            ) : (
              data.accounts.map((account: any) => {
                const guardian = related(account.guardians);
                const children = (guardian?.student_guardians || [])
                  .map((link: any) => related(link.students)?.full_name)
                  .filter(Boolean)
                  .join(", ");
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => void openAccount(account)}
                    style={{
                      width: "100%",
                      minHeight: 72,
                      padding: "14px 18px",
                      border: 0,
                      borderBottom: "1px solid var(--color-border)",
                      background: "white",
                      display: "grid",
                      gridTemplateColumns: "minmax(0,1fr) auto auto",
                      gap: 14,
                      alignItems: "center",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span>
                      <strong style={{ display: "block" }}>
                        {guardian?.full_name || "Родитель"}
                      </strong>
                      <small style={{ color: "var(--color-text-muted)" }}>
                        {children || guardian?.phone || "Дети не привязаны"}
                      </small>
                    </span>
                    <strong
                      style={{
                        color:
                          Number(account.balance) < 0
                            ? "var(--color-danger)"
                            : "var(--color-success)",
                      }}
                    >
                      {rub(account.balance)}
                    </strong>
                    <ChevronRight size={17} />
                  </button>
                );
              })
            )}
          </div>
        </section>
      )}
      {tab === "payroll" && (
        <section
          className="card-crm"
          style={{ background: "white", padding: 0, overflowX: "auto" }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}
          >
            <thead>
              <tr>
                {[
                  "Преподаватель / занятие",
                  "Посетили",
                  "Ставка",
                  "Сумма",
                  "Статус",
                  "Действие",
                ].map((label) => (
                  <th
                    key={label}
                    style={{
                      padding: 13,
                      textAlign: "left",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.payroll.map((entry: any) => {
                const teacher = related(entry.profiles);
                const lesson = related(entry.lesson_sessions);
                const group = related(lesson?.groups);
                return (
                  <tr key={entry.id}>
                    <td
                      style={{
                        padding: 13,
                        borderBottom: "1px solid var(--color-border)",
                      }}
                    >
                      <strong>{teacher?.full_name || "Преподаватель"}</strong>
                      <small
                        style={{
                          display: "block",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {group?.title || "Группа"} · {lesson?.lesson_date || ""}
                      </small>
                    </td>
                    <td style={{ padding: 13 }}>{entry.attendee_count}</td>
                    <td style={{ padding: 13 }}>{rub(entry.rate_snapshot)}</td>
                    <td style={{ padding: 13, fontWeight: 800 }}>
                      {rub(entry.amount)}
                    </td>
                    <td style={{ padding: 13 }}>
                      <span
                        className={`badge ${entry.status === "paid" ? "badge-green" : entry.status === "approved" ? "badge-blue" : "badge-amber"}`}
                      >
                        {entry.status === "paid"
                          ? "Выплачено"
                          : entry.status === "approved"
                            ? "Подтверждено"
                            : "Начислено"}
                      </span>
                    </td>
                    <td style={{ padding: 13 }}>
                      {data.canManage && entry.status !== "paid" && (
                        <Button
                          disabled={saving}
                          variant="secondary-site"
                          onClick={() =>
                            void post({
                              action: "payroll",
                              entryId: entry.id,
                              status:
                                entry.status === "accrued"
                                  ? "approved"
                                  : "paid",
                            })
                          }
                        >
                          {entry.status === "accrued"
                            ? "Подтвердить"
                            : "Отметить выплату"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
      {tab === "problems" && (
        <section style={{ display: "grid", gap: 10 }}>
          {data.problems.length === 0 ? (
            <div
              className="card-crm"
              style={{ background: "white", color: "var(--color-success)" }}
            >
              Открытых финансовых проблем нет.
            </div>
          ) : (
            data.problems.map((problem: any) => {
              const lesson = related(problem.lesson_sessions);
              const group = related(lesson?.groups);
              return (
                <article
                  key={problem.id}
                  className="card-crm"
                  style={{ background: "white", display: "flex", gap: 12 }}
                >
                  <AlertTriangle
                    size={20}
                    style={{ color: "var(--color-warning)", flex: "0 0 auto" }}
                  />
                  <div>
                    <strong>
                      {problem.warning_type === "missing_billing_contact"
                        ? "Не выбран плательщик"
                        : problem.warning_type === "missing_lesson_price"
                          ? "Не задана цена занятия"
                          : "Не задана ставка преподавателя"}
                    </strong>
                    <p
                      style={{
                        margin: "5px 0 0",
                        color: "var(--color-text-muted)",
                        fontSize: 13,
                      }}
                    >
                      {group?.title || "Занятие"} ·{" "}
                      {lesson?.lesson_date ||
                        new Date(problem.created_at).toLocaleDateString(
                          "ru-RU",
                        )}
                    </p>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}
      {selected && (
        <CrmDialog
          title={related(selected.guardians)?.full_name || "Лицевой счёт"}
          description={`Баланс: ${rub(selected.balance)}`}
          variant="drawer"
          width={560}
          onClose={() => {
            setSelected(null);
            setData((current: any) => ({ ...current, ledger: [] }));
          }}
        >
          <div style={{ display: "grid", gap: 18 }}>
            <section>
              <h3 style={{ margin: "0 0 10px" }}>История операций</h3>
              {data.ledger.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)" }}>
                  Операций пока нет.
                </p>
              ) : (
                data.ledger.map((entry: any) => (
                  <div
                    key={entry.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 8,
                      padding: "11px 0",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <span>
                      <strong>{entry.reason || entry.entry_type}</strong>
                      <small
                        style={{
                          display: "block",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        {new Date(entry.created_at).toLocaleString("ru-RU")}
                      </small>
                    </span>
                    <strong
                      style={{
                        color:
                          Number(entry.amount) < 0
                            ? "var(--color-danger)"
                            : "var(--color-success)",
                      }}
                    >
                      {Number(entry.amount) > 0 ? "+" : ""}
                      {rub(entry.amount)}
                    </strong>
                  </div>
                ))
              )}
            </section>
            {data.canManage && (
              <section
                className="card-crm"
                style={{
                  background: "var(--color-bg)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <h3 style={{ margin: 0 }}>Ручная корректировка</h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    color: "var(--color-text-muted)",
                  }}
                >
                  Положительная сумма — пополнение, отрицательная — списание.
                  Запись нельзя изменить или удалить.
                </p>
                <label>
                  Сумма
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    style={{
                      display: "block",
                      width: "100%",
                      minHeight: 42,
                      marginTop: 5,
                    }}
                  />
                </label>
                <label>
                  Причина корректировки
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={3}
                    style={{ display: "block", width: "100%", marginTop: 5 }}
                  />
                </label>
                <Button
                  disabled={saving || !amount || reason.trim().length < 3}
                  variant="primary-crm"
                  onClick={() =>
                    void post({
                      action: "adjust",
                      guardianId: selected.guardian_id,
                      amount: Number(amount),
                      reason,
                    })
                  }
                >
                  {saving ? "Сохраняем…" : "Добавить операцию"}
                </Button>
              </section>
            )}
          </div>
        </CrmDialog>
      )}
    </main>
  );
}
