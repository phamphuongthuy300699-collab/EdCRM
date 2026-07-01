"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { LogOut, GraduationCap, Home } from "lucide-react";

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
          <Link href="/parent" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: "1.1rem"
            }}>
              R
            </div>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", fontFamily: "var(--font-geologica)" }}>
              Личный кабинет Родителя
            </span>
          </Link>

          {/* Navigation / Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <Link href="/parent" style={{
              fontSize: "var(--font-small)",
              color: pathname === "/parent" ? "var(--color-primary)" : "var(--color-text-muted)",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <span>Главная</span>
            </Link>

            <Link href="/parent/payments" style={{
              fontSize: "var(--font-small)",
              color: pathname.startsWith("/parent/payments") ? "var(--color-primary)" : "var(--color-text-muted)",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}>
              <span>Оплаты и счета</span>
            </Link>

            <Link href="/" style={{
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
    </div>
  );
}
