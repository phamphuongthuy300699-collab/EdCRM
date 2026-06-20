import React from "react";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { Smile } from "lucide-react";

export default function ThanksPage() {
  return (
    <div style={{
      minHeight: "calc(100vh - 72px - 280px)", // Viewport minus header/footer heights approx
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(50% 50% at 50% 50%, #F5F7FA 0%, #FFFFFF 100%)",
      padding: "40px 20px"
    }}>
      <div className="card-site" style={{
        maxWidth: "500px",
        width: "100%",
        textAlign: "center",
        padding: "48px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px"
      }}>
        <div style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "var(--color-success-soft)",
          color: "var(--color-success)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Smile size={48} />
        </div>

        <h1 style={{
          fontFamily: "var(--font-geologica)",
          fontSize: "var(--font-h3)",
          color: "var(--color-text)"
        }}>
          Заявка принята!
        </h1>

        <p style={{
          fontSize: "var(--font-body)",
          color: "var(--color-text-muted)",
          lineHeight: 1.6
        }}>
          Спасибо за проявленный интерес. Администратор свяжется с вами по указанному телефону в течение 15 минут для уточнения расписания и возраста ребенка.
        </p>

        <Link href="/" style={{ marginTop: "12px", width: "100%" }}>
          <Button variant="primary-site" style={{ width: "100%" }}>
            Вернуться на главную
          </Button>
        </Link>
      </div>
    </div>
  );
}
