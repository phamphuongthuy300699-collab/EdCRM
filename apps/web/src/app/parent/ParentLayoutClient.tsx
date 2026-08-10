"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { CreditCard, LogOut, GraduationCap, Home } from "lucide-react";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/parent/login");
    router.refresh();
  };

  const isLoginPage = pathname === "/parent/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--color-bg)" }}>
      {/* Header */}
      <header style={{
        background: "white",
        borderBottom: "1px solid var(--color-border)",
        position: "sticky",
        top: 0,
        zIndex: 40,
        height: "64px"
      }}>
        <div className="container" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: "100%",
          padding: "0 20px"
        }}>
          {/* Logo */}
          <Link className="portal-logo" href="/parent" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <img 
              src="/api/crm/media?path=branding/roboks-logo.svg" 
              alt="Робокс" 
              style={{ width: "32px", height: "32px", objectFit: "contain" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextSibling as HTMLDivElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "var(--roboks-gradient)",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 900,
              fontSize: "1.1rem"
            }}>
              Р
            </div>
            <span style={{ fontWeight: 900, fontSize: "1.2rem", fontFamily: "var(--font-geologica)", color: "var(--color-text)" }}>
              Робокс <span className="portal-audience" style={{ fontWeight: 500, color: "var(--color-text-muted)", fontSize: "0.95rem" }}>Родителям</span>
            </span>
          </Link>

          {/* Navigation / Actions */}
          <div className="portal-actions" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <Link aria-label="Главная" href="/parent" style={{
              fontSize: "var(--font-small)",
              color: pathname === "/parent" ? "var(--color-primary)" : "var(--color-text-muted)",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <GraduationCap size={16} /><span className="portal-link-label">Главная</span>
            </Link>

            <Link aria-label="Оплаты и счета" href="/parent/payments" style={{
              fontSize: "var(--font-small)",
              color: pathname.startsWith("/parent/payments") ? "var(--color-primary)" : "var(--color-text-muted)",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <CreditCard size={16} /><span className="portal-link-label">Оплаты и счета</span>
            </Link>

            <Link aria-label="На сайт" href="/" style={{
              fontSize: "var(--font-small)",
              color: "var(--color-text-muted)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <Home size={16} />
              <span className="hidden-mobile">На сайт</span>
            </Link>

            <button 
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "var(--font-small)",
                background: "var(--color-danger-soft)",
                color: "var(--color-danger)",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <LogOut size={16} />
              <span className="hidden-mobile">Выйти</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "32px 0" }}>
        <div className="container" style={{ padding: "0 20px" }}>
          {children}
        </div>
      </main>
      <style jsx global>{`@media (max-width: 520px) { .portal-logo { gap: 5px !important; } .portal-logo img, .portal-logo > div { width: 28px !important; height: 28px !important; } .portal-logo > span { font-size: 15px !important; } .portal-audience, .portal-link-label, .hidden-mobile { display: none !important; } .portal-actions { gap: 5px !important; } .portal-actions a, .portal-actions button { width: 38px; height: 38px; padding: 0 !important; justify-content: center; border-radius: 9px; } header .container { padding: 0 10px !important; } main { padding-top: 18px !important; } main > .container { padding: 0 12px !important; } }`}</style>
    </div>
  );
}
