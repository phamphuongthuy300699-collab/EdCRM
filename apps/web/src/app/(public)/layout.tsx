import React from "react";
import Link from "next/link";
import Script from "next/script";
import { Button } from "@robotics-crm/ui";
import { Phone, Menu } from "lucide-react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ymId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  const ymScript = ymId ? `
    (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
    (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

    ym(${ymId}, "init", {
         clickmap:true,
         trackLinks:true,
         accurateTrackBounce:true,
         webvisor:true
    });
  ` : "";

  const gaScript = gaId ? `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}');
  ` : "";

  return (
    <>
      {ymId && (
        <Script id="yandex-metrika" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: ymScript }} />
      )}
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: gaScript }} />
        </>
      )}
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
                <li><Link href="/robototekhnika-dlya-detey-lipetsk" style={{ color: "#E5E7EB" }}>Робототехника</Link></li>
                <li><Link href="/programmirovanie-dlya-detey-lipetsk" style={{ color: "#E5E7EB" }}>Программирование</Link></li>
                <li><Link href="/raspisanie" style={{ color: "#E5E7EB" }}>Расписание</Link></li>
                <li><Link href="/stoimost" style={{ color: "#E5E7EB" }}>Стоимость</Link></li>
              </ul>
            </div>

            <div>
              <h4 style={{ marginBottom: "16px", fontSize: "var(--font-small)", textTransform: "uppercase", letterSpacing: "0.05em", color: "#9CA3AF" }}>Документы</h4>
              <ul style={{ listStyle: "none", display: "grid", gap: "12px", fontSize: "var(--font-small)" }}>
                <li><Link href="/privacy-policy" style={{ color: "#E5E7EB" }}>Конфиденциальность</Link></li>
                <li><Link href="/consent" style={{ color: "#E5E7EB" }}>Согласие на ОПД</Link></li>
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
            <Link href="/login" style={{ color: "#6B7280", textDecoration: "underline" }} className="hover-link-primary">
              Вход для сотрудников
            </Link>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
