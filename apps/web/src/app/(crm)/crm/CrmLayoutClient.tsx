"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { 
  LayoutDashboard, 
  Inbox, 
  Users, 
  GraduationCap, 
  CreditCard, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  User,
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  Globe,
  Receipt
} from "lucide-react";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    { name: "Дашборд", path: "/crm", icon: LayoutDashboard },
    { name: "Заявки (Лиды)", path: "/crm/leads", icon: Inbox },
    { name: "Ученики", path: "/crm/students", icon: Users },
    { name: "Родители", path: "/crm/guardians", icon: User },
    { name: "Группы", path: "/crm/groups", icon: GraduationCap },
    { name: "Счета (Invoices)", path: "/crm/invoices", icon: CreditCard },
    { name: "Платежи (Payments)", path: "/crm/payments", icon: Receipt },
    { name: "Учебные материалы", path: "/crm/materials", icon: BookOpen },
    { name: "Занятия", path: "/crm/lessons", icon: Calendar },
    { name: "Домашние задания", path: "/crm/homework", icon: ClipboardList },
    { name: "Скрипты продаж", path: "/crm/scripts", icon: FileText },
    { name: "Сайт", path: "/crm/site", icon: Globe },
    { name: "Настройки", path: "/crm/settings", icon: Settings },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-bg)" }}>
      {/* Sidebar */}
      <aside style={{
        width: "260px",
        background: "white",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "24px 16px",
        position: "fixed",
        height: "100vh",
        top: 0,
        left: 0,
        zIndex: 40
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Logo */}
          <Link href="/crm" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 8px", textDecoration: "none" }}>
            <img 
              src="/api/crm/media?path=branding/roboks-logo.svg" 
              alt="Робокс" 
              style={{ width: "32px", height: "32px", objectFit: "contain" }}
              onError={(e) => {
                // Fallback to stylized letter P
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
              Робокс<span style={{ color: "var(--roboks-pink)" }}>.</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  href={item.path} 
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    borderRadius: "10px",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "var(--font-small)",
                    background: isActive ? "var(--color-primary-soft)" : "transparent",
                    color: isActive ? "var(--color-primary-dark)" : "var(--color-text-muted)",
                    transition: "all 0.2s"
                  }}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px",
            borderTop: "1px solid var(--color-border)",
            fontSize: "var(--font-small)"
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "var(--color-surface-soft)",
              color: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <User size={16} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 700, color: "var(--color-text)", fontSize: "13px" }}>Менеджер</span>
              <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Липецк (Основной)</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "var(--font-small)",
              background: "none",
              border: "none",
              color: "var(--color-danger)",
              width: "100%",
              textAlign: "left",
              cursor: "pointer"
            }}
          >
            <LogOut size={18} />
            <span>Выйти из системы</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ marginLeft: "260px", flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Topbar */}
        <header style={{
          height: "64px",
          background: "white",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 32px",
          position: "sticky",
          top: 0,
          zIndex: 30
        }}>
          {/* Search bar */}
          <div style={{ position: "relative", width: "300px" }}>
            <Search size={18} style={{
              position: "absolute",
              left: "12px",
              top: "11px",
              color: "var(--color-text-muted)"
            }} />
            <input 
              type="text" 
              className="form-input" 
              style={{
                height: "40px",
                borderRadius: "8px",
                paddingLeft: "40px",
                fontSize: "var(--font-small)"
              }}
              placeholder="Поиск по ученикам, группам..." 
            />
          </div>

          {/* Quick Actions & Notifications */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button style={{
              background: "none",
              border: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              position: "relative",
              padding: "4px"
            }}>
              <Bell size={20} />
              <span style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                width: "8px",
                height: "8px",
                background: "var(--color-danger)",
                borderRadius: "50%"
              }} />
            </button>
            <div style={{
              fontSize: "var(--font-small)",
              fontWeight: 700,
              color: "var(--color-text)",
              background: "var(--color-bg)",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--color-border)"
            }}>
              Робототехника Липецк
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <main style={{ padding: "32px", flex: 1 }}>
          {children}
        </main>

      </div>
    </div>
  );
}
