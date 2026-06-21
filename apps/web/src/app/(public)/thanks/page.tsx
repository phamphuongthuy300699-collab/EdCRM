"use client";

import React from "react";
import Link from "next/link";
import { RoboAssistant } from "@/shared/ui/robo-assistant";
import { Home } from "lucide-react";

export default function ThanksPage() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--color-bg)",
      padding: "20px",
      fontFamily: "var(--font-inter), sans-serif"
    }}>
      <div style={{
        maxWidth: "540px",
        width: "100%",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
        background: "white",
        borderRadius: "var(--radius-card-site)",
        border: "1px solid var(--color-border)",
        padding: "48px",
        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.05)"
      }}>
        {/* Animated RoboAssistant */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <RoboAssistant
            context="thanks"
            mood="success"
            size="lg"
            message="Ура! Заявка успешно отправлена. Я передал её администратору на пульт! 🎉"
          />
        </div>

        <div>
          <h1 style={{
            fontFamily: "var(--font-geologica)",
            fontSize: "2rem",
            color: "var(--color-text)",
            marginBottom: "12px",
            lineHeight: 1.2
          }}>
            Спасибо за заявку!
          </h1>
          <p style={{
            color: "var(--color-text-muted)",
            fontSize: "var(--font-body)",
            lineHeight: 1.6,
            margin: 0
          }}>
            Наш инженерный куратор свяжется с вами по указанному телефону в течение 15 минут для подтверждения записи на пробное занятие и уточнения деталей.
          </p>
        </div>

        {/* Back Button */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
          <Link href="/" className="btn btn-primary-site" style={{
            background: "var(--color-primary)",
            color: "white",
            fontWeight: 700,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "0 24px",
            borderRadius: "var(--radius-button)",
            height: "48px"
          }}>
            <Home size={16} />
            <span>Вернуться на главную</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
