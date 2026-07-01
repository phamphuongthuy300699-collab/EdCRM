import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, Settings, ShieldAlert, Activity } from "lucide-react";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoMode } from "@/shared/utils/demo";

async function getDiagnosticsData() {
  if (isDemoMode()) {
    return {
      allowed: true,
      settings: {
        is_enabled: true,
        mode: "test",
        api_login: "demo_merchant",
        api_password_secret: "demo_pass",
        test_gateway_url: "https://web.sandbox.paymentgate.ru/payment/rest/",
        production_gateway_url: "https://payment.alfabank.ru/payment/rest/",
      }
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get active organization membership
  const { data: membership } = await (supabase.from("org_memberships") as any)
    .select("role, organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  const allowed = ["owner", "admin"].includes(membership?.role);
  if (!allowed) {
    return { allowed: false, settings: null };
  }

  // Load Alfabank acquiring provider settings using admin client to read securely
  const admin = createSupabaseAdminClient();
  const { data: settings } = await (admin.from("payment_provider_settings") as any)
    .select("*")
    .eq("organization_id", membership.organization_id)
    .eq("provider", "alfabank")
    .maybeSingle();

  return { allowed: true, settings };
}

export default async function PaymentDiagnosticsPage() {
  const { allowed, settings } = await getDiagnosticsData();

  if (!allowed) {
    return (
      <div style={{ display: "grid", gap: "16px", maxWidth: "720px" }}>
        <h1 style={{ margin: 0, fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)" }}>
          Диагностика платежей
        </h1>
        <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, background: "#fff", padding: 24 }}>
          <h2 style={{ marginTop: 0, color: "var(--color-danger)" }}>Доступ ограничен</h2>
          <p style={{ color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            Раздел диагностики платежного шлюза доступен только владельцу или администратору организации.
          </p>
        </div>
      </div>
    );
  }

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const isEnabled = Boolean(settings?.is_enabled);
  const mode = settings?.mode || "test";
  const apiLogin = settings?.api_login || "";
  const hasPassword = Boolean(settings?.api_password_secret);
  const testGatewayUrl = settings?.test_gateway_url || "https://web.sandbox.paymentgate.ru/payment/rest/";
  const prodGatewayUrl = settings?.production_gateway_url || "https://payment.alfabank.ru/payment/rest/";
  const currentGatewayUrl = mode === "production" ? prodGatewayUrl : testGatewayUrl;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", maxWidth: "800px" }}>
      {/* Back button */}
      <div>
        <Link 
          href="/crm/settings" 
          style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: "8px", 
            fontSize: "13px", 
            color: "var(--color-text-muted)", 
            textDecoration: "none",
            fontWeight: 600
          }}
        >
          <ArrowLeft size={16} />
          <span>Назад в настройки</span>
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", margin: "0 0 4px 0" }}>
            Диагностика эквайринга
          </h1>
          <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)", margin: 0 }}>
            Служебная сводка работоспособности подключения Альфа-Банка
          </p>
        </div>
        <div style={{
          background: isEnabled ? "var(--color-success-soft)" : "var(--color-danger-soft)",
          color: isEnabled ? "var(--color-success)" : "var(--color-danger)",
          padding: "8px 16px",
          borderRadius: "30px",
          fontSize: "12px",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: "6px"
        }}>
          <Activity size={14} />
          <span>{isEnabled ? "Активно" : "Выключено"}</span>
        </div>
      </div>

      {/* Health status checklist */}
      <div className="card-crm" style={{ background: "white", padding: "24px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: 0, marginBottom: "20px" }}>
          Чек-лист подключения
        </h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            {isEnabled ? <CheckCircle style={{ color: "var(--color-success)", marginTop: "2px" }} size={18} /> : <XCircle style={{ color: "var(--color-danger)", marginTop: "2px" }} size={18} />}
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>Статус провайдера</div>
              <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                {isEnabled ? "Онлайн-оплата включена для клиентов." : "Онлайн-оплата выключена. Кнопки оплаты будут недоступны."}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            {apiLogin ? <CheckCircle style={{ color: "var(--color-success)", marginTop: "2px" }} size={18} /> : <XCircle style={{ color: "var(--color-danger)", marginTop: "2px" }} size={18} />}
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>Идентификатор API Login</div>
              <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                {apiLogin ? `Настроен: "${apiLogin}"` : "Ошибка: API Login не задан в настройках эквайринга."}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            {hasPassword ? <CheckCircle style={{ color: "var(--color-success)", marginTop: "2px" }} size={18} /> : <XCircle style={{ color: "var(--color-danger)", marginTop: "2px" }} size={18} />}
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>Пароль API (Secret)</div>
              <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                {hasPassword ? "Надежно сохранен в зашифрованном виде." : "Ошибка: Пароль API не задан."}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            {currentGatewayUrl ? <CheckCircle style={{ color: "var(--color-success)", marginTop: "2px" }} size={18} /> : <XCircle style={{ color: "var(--color-danger)", marginTop: "2px" }} size={18} />}
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>Адрес шлюза банка</div>
              <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                Текущий шлюз: <code>{currentGatewayUrl}</code>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Integration endpoints */}
      <div className="card-crm" style={{ background: "white", padding: "24px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: 0, marginBottom: "20px" }}>
          Параметры интеграции
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Режим работы (Mode)</div>
            <div style={{ marginTop: "4px", fontSize: "14px" }}>
              <span className={`badge ${mode === "production" ? "badge-red" : "badge-blue"}`} style={{ fontWeight: 700 }}>
                {mode === "production" ? "PRODUCTION (РЕАЛЬНЫЕ ДЕНЬГИ)" : "TEST (ПЕСОЧНИЦА)"}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Callback Webhook URL</div>
            <div style={{ marginTop: "4px", fontSize: "13px", fontFamily: "monospace", background: "var(--color-bg)", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
              {baseUrl}/api/payments/alfabank/callback
            </div>
            <div style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "4px" }}>
              Зарегистрируйте этот адрес в ЛК Альфа-Банка для автоматического уведомления об оплатах.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Success Redirect URL</div>
              <div style={{ marginTop: "4px", fontSize: "13px", fontFamily: "monospace", background: "var(--color-bg)", padding: "8px", borderRadius: "6px", border: "1px solid var(--color-border)", overflowX: "auto" }}>
                {baseUrl}/payments/success
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>Fail Redirect URL</div>
              <div style={{ marginTop: "4px", fontSize: "13px", fontFamily: "monospace", background: "var(--color-bg)", padding: "8px", borderRadius: "6px", border: "1px solid var(--color-border)", overflowX: "auto" }}>
                {baseUrl}/payments/fail
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Safety warnings */}
      <div style={{
        background: "var(--color-primary-soft)",
        border: "1px solid var(--color-primary)",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        gap: "12px"
      }}>
        <ShieldAlert style={{ color: "var(--color-primary-dark)", flexShrink: 0 }} size={20} />
        <div>
          <div style={{ fontWeight: 700, color: "var(--color-primary-dark)", fontSize: "13px" }}>Безопасность конфигурации</div>
          <div style={{ fontSize: "12px", color: "var(--color-text)", marginTop: "2px", lineHeight: "1.4" }}>
            Данный отчет не содержит секретных ключей или паролей и полностью безопасен для отображения персоналу. Все секретные токены защищены RLS и шифрованием.
          </div>
        </div>
      </div>
    </div>
  );
}
