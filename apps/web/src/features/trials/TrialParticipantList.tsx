"use client";

import { useEffect, useState } from "react";
import { Button } from "@robotics-crm/ui";
import type {
  TrialParticipantDto,
  TrialParticipantResult,
  TrialParticipantStatus,
} from "./contracts";

const statusLabels: Record<TrialParticipantStatus, string> = {
  scheduled: "Запланирован",
  attended: "Пришёл",
  no_show: "Не пришёл",
  cancelled: "Отменён",
};
const resultLabels: Record<TrialParticipantResult, string> = {
  interested: "Заинтересован",
  not_interested: "Не заинтересован",
  enrolled: "Решили зачисляться",
  not_enrolled: "Не зачислились",
};

export function TrialParticipantList({
  participants,
  readOnly = false,
  onParticipantUpdated,
}: {
  participants: TrialParticipantDto[];
  readOnly?: boolean;
  onParticipantUpdated?: (participant: TrialParticipantDto) => void;
}) {
  const [rows, setRows] = useState(participants);
  const [savingId, setSavingId] = useState("");
  const [messages, setMessages] = useState<Record<string, string>>({});
  useEffect(() => setRows(participants), [participants]);

  function patchRow(id: string, patch: Partial<TrialParticipantDto>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }

  async function save(row: TrialParticipantDto) {
    if (savingId || readOnly) return;
    setSavingId(row.id);
    setMessages((current) => ({ ...current, [row.id]: "" }));
    try {
      const response = await fetch(`/api/crm/trials/participants/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: row.status,
          result: row.result,
          resultComment: row.resultComment,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok)
        throw new Error(payload.error || "Не удалось сохранить результат");
      const updated = {
        ...row,
        status: payload.participant?.status || row.status,
        result: payload.participant?.result ?? row.result,
        resultComment: payload.participant?.result_comment ?? row.resultComment,
      };
      patchRow(row.id, updated);
      setMessages((current) => ({
        ...current,
        [row.id]: "Результат сохранён",
      }));
      onParticipantUpdated?.(updated);
    } catch (cause) {
      setMessages((current) => ({
        ...current,
        [row.id]: (cause as Error).message,
      }));
    } finally {
      setSavingId("");
    }
  }

  if (!rows.length) return null;
  return (
    <section
      style={{ display: "grid", gap: 12 }}
      aria-label="Пробные участники"
    >
      <div>
        <h3 style={{ margin: 0, fontSize: 17 }}>Пробные участники</h3>
        <p
          style={{
            margin: "4px 0 0",
            color: "var(--color-text-muted)",
            fontSize: 12,
          }}
        >
          Отмечаются отдельно и не влияют на посещаемость, оплату или начисление
          преподавателю.
        </p>
      </div>
      {rows.map((row) => (
        <div
          key={row.id}
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            padding: 12,
            display: "grid",
            gap: 10,
            background: "var(--color-bg)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
            }}
          >
            <strong>{row.subjectName}</strong>
            <span className="badge badge-blue">
              {row.subjectKind === "lead" ? "Из заявки" : "Ученик CRM"}
            </span>
          </div>
          {readOnly ? (
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {statusLabels[row.status]}
              {row.result ? ` · ${resultLabels[row.result]}` : ""}
              {row.resultComment ? ` · ${row.resultComment}` : ""}
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
                  gap: 8,
                }}
              >
                <label style={{ display: "grid", gap: 4, fontSize: 11 }}>
                  Статус
                  <select
                    aria-label={`Статус — ${row.subjectName}`}
                    className="form-input"
                    value={row.status}
                    onChange={(event) =>
                      patchRow(row.id, {
                        status: event.target.value as TrialParticipantStatus,
                      })
                    }
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 4, fontSize: 11 }}>
                  Результат
                  <select
                    aria-label={`Результат — ${row.subjectName}`}
                    className="form-input"
                    value={row.result || ""}
                    onChange={(event) =>
                      patchRow(row.id, {
                        result: (event.target.value ||
                          null) as TrialParticipantResult | null,
                      })
                    }
                  >
                    <option value="">Пока не выбран</option>
                    {Object.entries(resultLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label style={{ display: "grid", gap: 4, fontSize: 11 }}>
                Комментарий
                <textarea
                  aria-label={`Комментарий — ${row.subjectName}`}
                  className="form-input"
                  rows={2}
                  value={row.resultComment || ""}
                  onChange={(event) =>
                    patchRow(row.id, {
                      resultComment: event.target.value || null,
                    })
                  }
                  style={{ height: "auto", padding: 9 }}
                />
              </label>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  role="status"
                  style={{
                    fontSize: 11,
                    color: messages[row.id]?.startsWith("Результат")
                      ? "var(--color-success)"
                      : "var(--color-danger)",
                  }}
                >
                  {messages[row.id]}
                </span>
                <Button
                  type="button"
                  variant="secondary-crm"
                  disabled={Boolean(savingId)}
                  onClick={() => void save(row)}
                >
                  {savingId === row.id ? "Сохраняем…" : "Сохранить результат"}
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
    </section>
  );
}
