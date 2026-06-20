"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@robotics-crm/ui";
import { createSupabaseBrowserClient } from "@/shared/db/supabase/browser";
import { Lock, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
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
      const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      if (isDemoMode) {
        // Симулируем вход для тестирования интерфейса на локалхосте
        router.push("/crm");
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message || "Неверный логин или пароль");
      }

      // Successful login -> redirect to crm dashboard
      router.push("/crm");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Ошибка авторизации");
    } finally {
      setLoading(false);
    }
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
          <span>Вернуться на сайт</span>
        </Link>

        {/* Login Card */}
        <div style={{
          background: "white",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-card-site)",
          padding: "40px",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.05)"
        }}>
          {/* Logo / Title */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: "1.5rem",
              fontFamily: "var(--font-geologica)",
              margin: "0 auto 16px auto"
            }}>
              R
            </div>
            <h1 style={{
              fontFamily: "var(--font-geologica)",
              fontSize: "1.5rem",
              color: "var(--color-text)",
              marginBottom: "8px"
            }}>
              Вход в CRM
            </h1>
            <p style={{
              fontSize: "var(--font-small)",
              color: "var(--color-text-muted)"
            }}>
              Панель управления Robotics CRM Липецк
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email сотрудника</label>
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
                  placeholder="name@robotics-lipetsk.ru" 
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
              style={{ width: "100%", height: "46px", background: "var(--color-primary)", marginTop: "12px" }}
              disabled={loading}
            >
              {loading ? "Выполняется вход..." : "Войти в систему"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
