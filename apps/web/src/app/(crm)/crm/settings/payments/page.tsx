import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { isDemoMode } from "@/shared/utils/demo";
import PaymentsSettingsClient from "./PaymentsSettingsClient";

async function canManagePayments() {
  if (isDemoMode()) return true;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await (supabase.from("org_memberships") as any)
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  return ["owner", "admin"].includes(membership?.role);
}

export default async function CrmPaymentSettingsPage() {
  const allowed = await canManagePayments();

  if (!allowed) {
    return (
      <div style={{ display: "grid", gap: "16px", maxWidth: "720px" }}>
        <h1 style={{ margin: 0, fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)" }}>
          Настройки платежей
        </h1>
        <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, background: "#fff", padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Доступ ограничен</h2>
          <p style={{ color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            Раздел настроек интернет-эквайринга доступен только владельцу или администратору организации.
          </p>
        </div>
      </div>
    );
  }

  return <PaymentsSettingsClient />;
}
