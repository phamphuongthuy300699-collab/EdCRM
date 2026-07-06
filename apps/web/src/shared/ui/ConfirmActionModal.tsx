"use client";

import React, { useState } from "react";
import { Button } from "@robotics-crm/ui";

type DangerLevel = "safe" | "warning" | "danger";

export type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  description: string;
  dangerLevel?: DangerLevel;
  confirmText: string;
  expectedText?: string;
  requireTypedConfirmation?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

const tone: Record<DangerLevel, { border: string; bg: string; text: string }> = {
  safe: { border: "#BBF7D0", bg: "#F0FDF4", text: "#166534" },
  warning: { border: "#FED7AA", bg: "#FFF7ED", text: "#9A3412" },
  danger: { border: "#FECACA", bg: "#FEF2F2", text: "#991B1B" },
};

export function ConfirmActionModal({
  open,
  title,
  description,
  dangerLevel = "warning",
  confirmText,
  expectedText = "УДАЛИТЬ",
  requireTypedConfirmation = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  const [typedValue, setTypedValue] = useState("");
  if (!open) return null;

  const colors = tone[dangerLevel];
  const canConfirm = !requireTypedConfirmation || typedValue.trim() === expectedText;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-action-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(15, 23, 42, 0.48)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "460px", background: "#fff", borderRadius: "12px", border: "1px solid var(--color-border)", padding: "24px", display: "grid", gap: "16px", boxShadow: "0 24px 80px rgba(15, 23, 42, 0.24)" }}>
        <div style={{ border: `1px solid ${colors.border}`, background: colors.bg, color: colors.text, borderRadius: "10px", padding: "14px 16px", display: "grid", gap: "8px" }}>
          <h3 id="confirm-action-title" style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>{title}</h3>
          <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.55 }}>{description}</p>
        </div>

        {requireTypedConfirmation && (
          <label style={{ display: "grid", gap: "6px", fontSize: "12px", fontWeight: 700, color: "var(--color-text)" }}>
            Введите «{expectedText}» для подтверждения
            <input
              value={typedValue}
              onChange={(event) => setTypedValue(event.target.value)}
              className="form-input"
              autoFocus
            />
          </label>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid var(--color-border)", paddingTop: "14px" }}>
          <Button type="button" variant="secondary-crm" disabled={loading} onClick={onCancel}>
            Отмена
          </Button>
          <Button
            type="button"
            variant={dangerLevel === "danger" ? "danger-crm" as any : "primary-crm"}
            disabled={loading || !canConfirm}
            onClick={onConfirm}
          >
            {loading ? "Выполняется..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
