"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Clock, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@robotics-crm/ui";

function PaymentSuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(false);
  const [statusText, setStatusText] = useState("Статус уточняется...");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    if (!orderId) return;

    async function verifyPayment() {
      try {
        setChecking(true);
        setStatusText("Проверяем статус платежа в банке...");

        const res = await fetch("/api/payments/alfabank/status", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paymentId: orderId }),
        });

        const data = await res.json();
        if (res.ok && data.ok) {
          setVerified(true);
          setStatusText(data.status === "paid" ? "Оплата успешно подтверждена!" : `Статус платежа: ${data.status}`);
        } else {
          setStatusText("Платеж зарегистрирован банком. Обновляем статус...");
        }
      } catch (err) {
        console.error("Verification error:", err);
        setStatusText("Платеж принят к обработке. Статус обновится в течение минуты.");
      } finally {
        setChecking(false);
      }
    }

    verifyPayment();
  }, [searchParams]);

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
          background: verified ? "var(--color-success-soft)" : "var(--color-primary-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: verified ? "var(--color-success)" : "var(--color-primary)"
        }}>
          {verified ? <CheckCircle size={36} /> : <Clock size={36} className={checking ? "spin" : ""} />}
        </div>

        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 8px 0" }}>
            Оплата совершена!
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0 }}>
            {statusText}
          </p>
        </div>

        {checking && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--color-text-muted)" }}>
            <RefreshCw size={14} className="spin" />
            <span>Связываемся со шлюзом эквайринга...</span>
          </div>
        )}

        <div style={{ width: "100%", borderTop: "1px solid var(--color-border)", paddingTop: "16px", marginTop: "8px" }}>
          <Button 
            onClick={() => router.push("/parent/payments")}
            variant="primary-site"
            style={{ width: "100%", height: "44px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <span>В личный кабинет</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
        <p style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Загрузка результата оплаты...</p>
      </div>
    }>
      <PaymentSuccessInner />
    </Suspense>
  );
}
