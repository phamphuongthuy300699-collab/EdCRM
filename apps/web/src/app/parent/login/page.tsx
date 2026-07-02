"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@robotics-crm/ui";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { Lock, Mail, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

import { isDemoMode } from "@/shared/utils/demo";

export default function ParentLoginPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      if (isDemoMode() || (isDemoMode() && email === "parent@robotics-crm.ru" && password === "demo")) {
        // Sign-in demo mock redirect
        window.location.href = "/parent";
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message || "Неверный логин или пароль");
      }

      window.location.href = "/parent";
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail("parent@robotics-crm.ru");
    setPassword("demo");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-bg)",
      padding: "20px"
    }}>
      <div style={{
        maxWidth: "420px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "24px"
      }}>
        {/* Back Link */}
        <Link href="/" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          color: "var(--color-text-muted)",
          fontSize: "var(--font-small)",
          fontWeight: 600,
          width: "fit-content"
        }}>
          <ArrowLeft size={16} />
          <span>На главную страницу сайта</span>
        </Link>

        {/* Login Card */}
        <div style={{
          background: "white",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-card-site)",
          padding: "40px",
          boxShadow: "0 20px 40px rgba(249, 115, 22, 0.05)"
        }}>
          {/* Logo / Title */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <img 
              src="/api/crm/media?path=branding/roboks-logo.svg" 
              alt="Робокс" 
              style={{ width: "48px", height: "48px", objectFit: "contain", margin: "0 auto 16px auto" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextSibling as HTMLDivElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "var(--roboks-gradient)",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 900,
              fontSize: "1.5rem",
              fontFamily: "var(--font-geologica)",
              margin: "0 auto 16px auto"
            }}>
              Р
            </div>
            <h1 style={{
              fontFamily: "var(--font-geologica)",
              fontSize: "1.5rem",
              color: "var(--color-text)",
              marginBottom: "8px",
              fontWeight: 800
            }}>
              Робокс Родителям
            </h1>
            <p style={{
              fontSize: "var(--font-small)",
              color: "var(--color-text-muted)"
            }}>
              Контролируйте занятия и успеваемость вашего инженера
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email родителя</label>
              <div style={{ position: "relative" }}>
                <Mail size={18} style={{
                  position: "absolute",
                  left: "14px",
                  top: "15px",
                  color: "var(--color-text-muted)"
                }} />
                <input 
                  type="email" 
                  className="form-input" 
                  style={{ paddingLeft: "44px" }}
                  placeholder="parent@robotics-crm.ru" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Пароль</label>
              <div style={{ position: "relative" }}>
                <Lock size={18} style={{
                  position: "absolute",
                  left: "14px",
                  top: "15px",
                  color: "var(--color-text-muted)"
                }} />
                <input 
                  type="password" 
                  className="form-input" 
                  style={{ paddingLeft: "44px" }}
                  placeholder="••••••••" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {errorMsg && (
              <div style={{
                background: "var(--color-danger-soft)",
                color: "var(--color-danger)",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "var(--font-small)",
                fontWeight: 600,
                marginBottom: "20px"
              }}>
                {errorMsg}
              </div>
            )}

            <Button 
              type="submit" 
              variant="primary-site" 
              style={{ width: "100%", height: "46px", background: "var(--color-accent)", marginTop: "12px" }}
              disabled={loading}
            >
              {loading ? "Выполняется вход..." : "Войти в кабинет"}
            </Button>
          </form>

          {/* Quick Demo Assist */}
          <div style={{
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px dashed var(--color-border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px"
          }}>
            <button
              onClick={handleQuickDemo}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-primary)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <Sparkles size={14} />
              <span>Заполнить демо-данными</span>
            </button>
            <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
              parent@robotics-crm.ru / demo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
