import React from "react";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { Phone, Menu } from "lucide-react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--color-border)",
        height: "72px",
        display: "flex",
        alignItems: "center"
      }}>
        <div className="container" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: "1.2rem",
              fontFamily: "var(--font-geologica)"
            }}>
              R
            </div>
            <span style={{
              fontWeight: 800,
              fontSize: "1.25rem",
              fontFamily: "var(--font-geologica)",
              color: "var(--color-text)"
            }}>
              Robotics<span style={{ color: "var(--color-primary)" }}>.</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
            fontFamily: "var(--font-inter)",
            fontWeight: 600,
            fontSize: "var(--font-small)",
            color: "var(--color-text-muted)"
          }}>
            <a href="#courses" style={{ transition: "color 0.2s" }} className="nav-link">Курсы</a>
            <a href="#schedule" style={{ transition: "color 0.2s" }} className="nav-link">Группы</a>
            <a href="#prices" style={{ transition: "color 0.2s" }} className="nav-link">Стоимость</a>
            <a href="#teachers" style={{ transition: "color 0.2s" }} className="nav-link">Преподаватели</a>
            <a href="#faq" style={{ transition: "color 0.2s" }} className="nav-link">Вопросы</a>
            <a href="#contacts" style={{ transition: "color 0.2s" }} className="nav-link">Контакты</a>
          </nav>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <a href="tel:+79991234567" style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 600,
              fontSize: "var(--font-small)",
              color: "var(--color-text)",
              transition: "color 0.2s"
            }}>
              <Phone size={16} style={{ color: "var(--color-primary)" }} />
              <span>+7 (999) 123-45-67</span>
            </a>
            <a href="#lead-form">
              <Button variant="primary-site" style={{ height: "42px", fontSize: "var(--font-small)" }}>
                Записаться
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, background: "#FFFFFF" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        background: "var(--color-text)",
        color: "white",
        padding: "64px 0 32px 0",
        borderTop: "1px solid var(--color-border)"
      }}>
        <div className="container">
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "48px",
            marginBottom: "48px"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 800
                }}>
                  R
                </div>
                <span style={{ fontWeight: 800, fontFamily: "var(--font-geologica)", fontSize: "1.2rem" }}>
                  Robotics
                </span>
              </div>
              <p style={{ color: "#9CA3AF", fontSize: "var(--font-small)", maxWidth: "250px" }}>
                Современная школа инженерного мышления и робототехники для детей 6–14 лет в Липецке.
              </p>
            </div>
            
            <div>
              <h4 style={{ marginBottom: "16px", fontSize: "var(--font-small)", textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>Навигация</h4>
              <ul style={{ listStyle: "none", display: "grid", gap: "12px", fontSize: "var(--font-small)" }}>
                <li><a href="#courses" style={{ color: "#E5E7EB" }}>Направления</a></li>
                <li><a href="#schedule" style={{ color: "#E5E7EB" }}>Расписание</a></li>
                <li><a href="#prices" style={{ color: "#E5E7EB" }}>Стоимость</a></li>
                <li><a href="#faq" style={{ color: "#E5E7EB" }}>FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 style={{ marginBottom: "16px", fontSize: "var(--font-small)", textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>Для сотрудников</h4>
              <ul style={{ listStyle: "none", display: "grid", gap: "12px", fontSize: "var(--font-small)" }}>
                <li><Link href="/login" style={{ color: "#E5E7EB" }}>Вход в CRM</Link></li>
                <li><Link href="/crm" style={{ color: "#E5E7EB" }}>Панель управления</Link></li>
              </ul>
            </div>

            <div>
              <h4 style={{ marginBottom: "16px", fontSize: "var(--font-small)", textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>Контакты</h4>
              <p style={{ color: "#E5E7EB", fontSize: "var(--font-small)", marginBottom: "8px" }}>
                г. Липецк, ул. Ленина, д. 10
              </p>
              <p style={{ color: "#E5E7EB", fontSize: "var(--font-small)", marginBottom: "8px" }}>
                +7 (999) 123-45-67
              </p>
              <p style={{ color: "#E5E7EB", fontSize: "var(--font-small)" }}>
                info@robotics-lipetsk.ru
              </p>
            </div>
          </div>

          <div style={{
            borderTop: "1px solid #374151",
            paddingTop: "32px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "var(--font-xs)",
            color: "#9CA3AF"
          }}>
            <span>© {new Date().getFullYear()} Robotics Липецк. Все права защищены.</span>
            <span>Разработано для будущего инженеров</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
