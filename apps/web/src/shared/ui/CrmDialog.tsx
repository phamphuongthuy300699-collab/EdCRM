"use client";

import { X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useEffect, useId } from "react";

export function CrmDialog({ title, description, onClose, children, footer, width = 640, variant = "dialog", closeLabel = "Закрыть" }: {
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number | string;
  variant?: "dialog" | "drawer";
  closeLabel?: string;
}) {
  const titleId = useId();
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const panelStyle: CSSProperties = {
    width: variant === "drawer" ? `min(${typeof width === "number" ? `${width}px` : width}, 100%)` : `min(${typeof width === "number" ? `${width}px` : width}, calc(100vw - 32px))`,
    maxHeight: "90dvh",
    display: "flex",
    flexDirection: "column",
    background: "white",
    border: "1px solid var(--color-border)",
    borderRadius: variant === "drawer" ? "18px 0 0 18px" : "var(--radius-card-site)",
    boxShadow: "0 24px 60px rgba(15,23,42,.18)",
    overflow: "hidden",
  };

  return (
    <div className={`crm-dialog-backdrop ${variant === "drawer" ? "crm-dialog-backdrop-drawer" : ""}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`crm-dialog-panel ${variant === "drawer" ? "crm-dialog-panel-drawer" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} style={panelStyle}>
        <header className="crm-dialog-header" style={{ flex: "0 0 auto", padding: "20px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", background: "white" }}>
          <div><h2 id={titleId} style={{ margin: 0, fontSize: 20 }}>{title}</h2>{description && <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>{description}</p>}</div>
          <button type="button" aria-label={closeLabel} onClick={onClose} style={{ width: 44, minHeight: 44, flex: "0 0 44px", border: 0, borderRadius: 9, background: "var(--color-bg)", color: "var(--color-text-muted)", display: "grid", placeItems: "center", cursor: "pointer" }}><X size={20} /></button>
        </header>
        <div className="crm-dialog-body" style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "20px 24px" }}>{children}</div>
        {footer && <footer className="crm-dialog-footer" style={{ flex: "0 0 auto", padding: "14px 24px", borderTop: "1px solid var(--color-border)", background: "white", display: "flex", justifyContent: "flex-end", gap: 10 }}>{footer}</footer>}
      </section>
      <style jsx global>{`
        .crm-dialog-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(15,23,42,.42); backdrop-filter: blur(3px); display: grid; place-items: center; padding: 16px; }
        .crm-dialog-backdrop-drawer { place-items: stretch end; padding: 0; }
        .crm-dialog-panel-drawer { height: 100dvh; max-height: 100dvh !important; }
        .crm-dialog-panel button, .crm-dialog-panel input, .crm-dialog-panel select { min-height: 44px; }
        @media (max-width: 640px) {
          .crm-dialog-backdrop { align-items: end; padding: 0; }
          .crm-dialog-panel { width: 100% !important; max-height: 95dvh !important; border-radius: 18px 18px 0 0 !important; }
          .crm-dialog-panel-drawer { height: 95dvh; }
          .crm-dialog-header { padding: 16px !important; }
          .crm-dialog-body { padding: 16px !important; }
          .crm-dialog-footer { padding: 12px 16px max(12px, env(safe-area-inset-bottom)) !important; position: sticky; bottom: 0; }
          .crm-dialog-footer > * { flex: 1; min-height: 44px; }
        }
      `}</style>
    </div>
  );
}
