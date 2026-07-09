"use client";

import { useState } from "react";
import { Button } from "@robotics-crm/ui";

export default function PayTokenClient({ publicId, disabled }: { publicId: string; disabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    if (disabled || loading) return;
    try {
      setLoading(true);
      setError("");
      const response = await fetch("/api/payments/public-link/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ publicId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.paymentUrl) {
        throw new Error(payload.error || "Не удалось открыть оплату");
      }
      window.location.assign(payload.paymentUrl);
    } catch (err: any) {
      setError(err.message || "Не удалось открыть оплату");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "10px" }}>
      <Button type="button" variant="primary-site" onClick={handlePay} disabled={disabled || loading}>
        {loading ? "Открываем оплату..." : "Оплатить"}
      </Button>
      {error && <div style={{ color: "#B91C1C", fontSize: "13px", fontWeight: 700 }}>{error}</div>}
    </div>
  );
}
