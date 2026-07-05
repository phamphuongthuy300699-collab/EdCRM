"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { XCircle, ArrowLeft, RefreshCcw } from "lucide-react";
import { Button } from "@robotics-crm/ui";

export default function PaymentFailPage() {
  const router = useRouter();

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
        background: "white",
        border: "1px solid var(--color-border)",
        borderRadius: "16px",
        padding: "40px",
        maxWidth: "480px",
        width: "100%",
        textAlign: "center",
        boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        alignItems: "center"
      }}>
        <div style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "var(--color-danger-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-danger)"
        }}>
          <XCircle size={36} />
        </div>

        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 8px 0" }}>
            Оплата не завершена
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
            Транзакция была отменена, прервана или отклонена банком. Деньги с вашей карты не были списаны.
          </p>
        </div>

        <div style={{
          width: "100%",
          borderTop: "1px solid var(--color-border)",
          paddingTop: "20px",
          marginTop: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          <Button 
            onClick={() => router.push("/parent/payments")}
            variant="primary-site"
            style={{ width: "100%", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "var(--color-accent)" }}
          >
            <RefreshCcw size={16} />
            <span>Попробовать снова</span>
          </Button>

          <Button 
            onClick={() => router.push("/parent")}
            variant="secondary-site"
            style={{ width: "100%", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <ArrowLeft size={16} />
            <span>Вернуться на главную</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
