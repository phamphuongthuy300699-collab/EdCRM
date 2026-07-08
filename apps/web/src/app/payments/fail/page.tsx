"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { XCircle, ArrowLeft, RefreshCcw, Clock } from "lucide-react";
import { Button } from "@robotics-crm/ui";

function PaymentFailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking, setChecking] = useState(false);
  const [statusText, setStatusText] = useState("Уточняем статус платежа в банке...");

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    const paymentId = searchParams.get("paymentId");
    if (!orderId && !paymentId) {
      setStatusText("Транзакция была отменена, прервана или отклонена банком. Деньги с вашей карты не были списаны.");
      return;
    }

    const isUuid = (value: string | null): value is string => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));

    async function verifyPayment() {
      try {
        setChecking(true);
        const bodyPayload: Record<string, string> = {};
        if (isUuid(paymentId)) bodyPayload.paymentId = paymentId;
        else if (isUuid(orderId)) bodyPayload.paymentId = orderId;
        else if (orderId) bodyPayload.providerOrderId = orderId;

        const response = await fetch("/api/payments/alfabank/status", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });
        const payload = await response.json();
        if (response.ok && payload.ok) {
          if (payload.status === "paid") setStatusText("Банк подтвердил оплату. Счет будет отмечен оплаченным.");
          else if (payload.status === "failed" || payload.status === "cancelled") setStatusText("Банк подтвердил, что платеж не завершен. Счет остается доступным для повторной оплаты.");
          else setStatusText(`Статус платежа: ${payload.status}. Если деньги списались, статус обновится после подтверждения банка.`);
        } else {
          setStatusText("Платеж не завершен. Счет остается доступным для повторной оплаты.");
        }
      } catch (error) {
        console.error("Fail payment verification error:", error);
        setStatusText("Платеж не завершен. Счет остается доступным для повторной оплаты.");
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
          background: "var(--color-danger-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-danger)"
        }}>
          {checking ? <Clock size={36} className="spin" /> : <XCircle size={36} />}
        </div>

        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 8px 0" }}>
            Оплата не завершена
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
            {statusText}
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

export default function PaymentFailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg)" }}>
        <p style={{ fontWeight: 600, color: "var(--color-text-muted)" }}>Загрузка результата оплаты...</p>
      </div>
    }>
      <PaymentFailInner />
    </Suspense>
  );
}
