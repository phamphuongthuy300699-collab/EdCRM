"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { TrialSubjectInput } from "./contracts";
import { trialSubjectKey } from "./domain";

export type TrialSubjectOption = {
  kind: "lead" | "student";
  id: string;
  name: string;
  detail?: string;
};

export function TrialSubjectPicker({
  options,
  selected,
  onChange,
}: {
  options: TrialSubjectOption[];
  selected: TrialSubjectInput[];
  onChange: (selected: TrialSubjectInput[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selectedKeys = new Set(selected.map(trialSubjectKey));
  const optionByKey = new Map(
    options.map((option) => [`${option.kind}:${option.id}`, option]),
  );
  const visible = useMemo(() => {
    const normalized = query.toLocaleLowerCase("ru-RU").trim();
    return options.filter(
      (option) =>
        !normalized ||
        `${option.name} ${option.detail || ""}`
          .toLocaleLowerCase("ru-RU")
          .includes(normalized),
    );
  }, [options, query]);

  function add(option: TrialSubjectOption) {
    const subject: TrialSubjectInput =
      option.kind === "lead" ? { leadId: option.id } : { studentId: option.id };
    if (!selectedKeys.has(trialSubjectKey(subject)))
      onChange([...selected, subject]);
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {selected.map((subject) => {
          const key = trialSubjectKey(subject);
          const option = optionByKey.get(key);
          const name = option?.name || "Выбранный участник";
          return (
            <span
              key={key}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 8px",
                borderRadius: 999,
                background: "var(--color-primary-soft)",
                color: "var(--color-primary-dark)",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {name}
              <button
                type="button"
                aria-label={`Удалить ${name}`}
                onClick={() =>
                  onChange(
                    selected.filter(
                      (candidate) => trialSubjectKey(candidate) !== key,
                    ),
                  )
                }
                style={{
                  border: 0,
                  background: "transparent",
                  padding: 0,
                  display: "inline-flex",
                  cursor: "pointer",
                  color: "inherit",
                }}
              >
                <X size={13} />
              </button>
            </span>
          );
        })}
      </div>
      <label style={{ position: "relative", display: "block" }}>
        <span className="sr-only">Поиск участника</span>
        <Search
          size={15}
          style={{
            position: "absolute",
            left: 11,
            top: 12,
            color: "var(--color-text-muted)",
          }}
        />
        <input
          aria-label="Поиск участника"
          className="form-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Имя ребёнка или родителя"
          style={{ paddingLeft: 34 }}
        />
      </label>
      <div
        style={{
          display: "grid",
          gap: 6,
          maxHeight: 220,
          overflowY: "auto",
          border: "1px solid var(--color-border)",
          borderRadius: 9,
          padding: 6,
        }}
      >
        {visible.map((option) => {
          const key = `${option.kind}:${option.id}`;
          const alreadySelected = selectedKeys.has(key);
          return (
            <button
              key={key}
              type="button"
              aria-label={`Добавить ${option.name}`}
              disabled={alreadySelected}
              onClick={() => add(option)}
              style={{
                border: 0,
                borderRadius: 7,
                background: alreadySelected ? "var(--color-bg)" : "white",
                padding: "9px 10px",
                textAlign: "left",
                cursor: alreadySelected ? "default" : "pointer",
                opacity: alreadySelected ? 0.55 : 1,
              }}
            >
              <strong style={{ display: "block", fontSize: 12 }}>
                {option.name}
              </strong>
              <small style={{ color: "var(--color-text-muted)" }}>
                {option.kind === "lead" ? "Заявка" : "Ученик"}
                {option.detail ? ` · ${option.detail}` : ""}
              </small>
            </button>
          );
        })}
        {visible.length === 0 && (
          <span
            style={{
              padding: 12,
              color: "var(--color-text-muted)",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            Ничего не найдено
          </span>
        )}
      </div>
    </div>
  );
}
