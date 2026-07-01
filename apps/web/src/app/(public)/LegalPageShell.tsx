import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPageShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div style={{ background: "#F7F9FC", minHeight: "100%" }}>
      <section className="container" style={{ padding: "72px 20px 48px", maxWidth: "960px" }}>
        <Link href="/" style={{ color: "var(--color-primary)", fontWeight: 700, fontSize: "14px" }}>
          Вернуться на главную
        </Link>
        <div style={{ marginTop: "28px", display: "grid", gap: "18px" }}>
          <p style={{ color: "var(--color-primary)", fontWeight: 800, textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.06em" }}>
            Робокс48
          </p>
          <h1 style={{ fontFamily: "var(--font-geologica)", fontSize: "clamp(2rem, 4vw, 3.2rem)", lineHeight: 1.08, color: "var(--color-text)" }}>
            {title}
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "1.05rem", lineHeight: 1.7, maxWidth: "760px" }}>
            {lead}
          </p>
        </div>
      </section>
      <section className="container" style={{ padding: "0 20px 80px", maxWidth: "960px" }}>
        <article style={{ background: "#FFFFFF", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "clamp(24px, 4vw, 44px)", boxShadow: "0 18px 45px rgba(17, 24, 39, 0.06)" }}>
          {children}
        </article>
      </section>
    </div>
  );
}

export function InfoGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px", margin: 0 }}>
      {items.map((item) => (
        <div key={item.label} style={{ border: "1px solid var(--color-border)", borderRadius: "8px", padding: "16px", background: "#F9FAFB" }}>
          <dt style={{ color: "var(--color-text-muted)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
            {item.label}
          </dt>
          <dd style={{ margin: 0, color: "var(--color-text)", fontWeight: 700, lineHeight: 1.5 }}>
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: "12px", marginTop: "28px" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--color-text)" }}>{title}</h2>
      <div style={{ color: "var(--color-text-muted)", lineHeight: 1.75 }}>{children}</div>
    </section>
  );
}

export function PlaceholderNotice({ children }: { children: ReactNode }) {
  return (
    <div style={{ border: "1px solid #FED7AA", background: "#FFF7ED", color: "#9A3412", borderRadius: "8px", padding: "14px 16px", fontWeight: 700, lineHeight: 1.5, marginBottom: "24px" }}>
      {children}
    </div>
  );
}
