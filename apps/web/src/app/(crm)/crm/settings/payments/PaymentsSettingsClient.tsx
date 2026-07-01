"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@robotics-crm/ui";
import { AlertTriangle, CheckCircle2, CreditCard, Save, ShieldCheck } from "lucide-react";

type Settings = {
  provider: "alfabank";
  is_enabled: boolean;
  mode: "test" | "production";
  api_login: string;
  test_gateway_url: string;
  production_gateway_url: string;
  callback_path: string;
  success_path: string;
  fail_path: string;
  currency: "RUB";
  payment_stage: "one_step" | "two_step";
  sbp_enabled: boolean;
  fiscalization_enabled: boolean;
  taxation_system: string;
  vat_rate: string;
  settings: Record<string, any>;
};

const defaultSettings: Settings = {
  provider: "alfabank",
  is_enabled: false,
  mode: "test",
  api_login: "",
  test_gateway_url: "https://web.rbsuat.com/ab/rest/",
  production_gateway_url: "https://engine.paymentgate.ru/payment/rest/",
  callback_path: "/api/payments/alfabank/callback",
  success_path: "/parent/payments?payment=success",
  fail_path: "/parent/payments?payment=fail",
  currency: "RUB",
  payment_stage: "one_step",
  sbp_enabled: false,
  fiscalization_enabled: false,
  taxation_system: "",
  vat_rate: "none",
  settings: {},
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="payment-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export default function PaymentsSettingsClient() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [apiPassword, setApiPassword] = useState("");
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/crm/payment-settings/alfabank", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось загрузить настройки");
        setSettings({ ...defaultSettings, ...(payload.settings || {}) });
        setPasswordConfigured(Boolean(payload.passwordConfigured));
      } catch (loadError: any) {
        setError(loadError.message || "Не удалось загрузить настройки");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/crm/payment-settings/alfabank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: settings.is_enabled,
          mode: settings.mode,
          apiLogin: settings.api_login,
          apiPassword,
          testGatewayUrl: settings.test_gateway_url,
          productionGatewayUrl: settings.production_gateway_url,
          callbackPath: settings.callback_path,
          successPath: settings.success_path,
          failPath: settings.fail_path,
          currency: settings.currency,
          paymentStage: settings.payment_stage,
          sbpEnabled: settings.sbp_enabled,
          fiscalizationEnabled: settings.fiscalization_enabled,
          taxationSystem: settings.taxation_system,
          vatRate: settings.vat_rate,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Не удалось сохранить настройки");
      setApiPassword("");
      setPasswordConfigured(Boolean(payload.passwordConfigured));
      setNotice("Настройки Альфа-Банка сохранены. Пароль не отображается после сохранения.");
    } catch (saveError: any) {
      setError(saveError.message || "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }

  async function checkSettings() {
    setChecking(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/crm/payment-settings/alfabank/check", { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "Проверка не пройдена");
      setNotice(payload.message || "Настройки проверены");
    } catch (checkError: any) {
      setError(checkError.message || "Не удалось проверить настройки");
    } finally {
      setChecking(false);
    }
  }

  const lastCheckedAt = settings.settings?.lastCheckedAt ? new Date(settings.settings.lastCheckedAt).toLocaleString("ru-RU") : "ещё не выполнялась";

  return (
    <div className="payment-settings-page">
      <style>{`
        .payment-settings-page { display: grid; gap: 22px; max-width: 1120px; }
        .payment-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
        .payment-header h1 { margin: 0 0 6px; font-size: var(--font-h2); font-family: var(--font-geologica); color: var(--color-text); }
        .payment-header p { margin: 0; color: var(--color-text-muted); font-size: 14px; line-height: 1.55; }
        .payment-card { background: #fff; border: 1px solid var(--color-border); border-radius: 12px; padding: 22px; display: grid; gap: 18px; }
        .payment-card-title { display: flex; align-items: center; justify-content: space-between; gap: 14px; border-bottom: 1px solid var(--color-border); padding-bottom: 16px; }
        .payment-card-title h2 { margin: 0 0 4px; font-size: 18px; font-weight: 800; }
        .payment-card-title p { margin: 0; color: var(--color-text-muted); font-size: 13px; line-height: 1.45; }
        .payment-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .payment-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .payment-field { display: grid; gap: 6px; font-size: 12px; font-weight: 750; color: var(--color-text); }
        .payment-field small { color: var(--color-text-muted); line-height: 1.45; font-weight: 500; }
        .payment-input { height: 42px; border: 1px solid var(--color-border); border-radius: 8px; padding: 0 12px; font: inherit; color: var(--color-text); background: #fff; }
        .payment-select { height: 42px; border: 1px solid var(--color-border); border-radius: 8px; padding: 0 12px; font: inherit; background: #fff; color: var(--color-text); }
        .payment-toggle { display: flex; gap: 9px; align-items: center; font-weight: 750; color: var(--color-text); }
        .payment-toggle input { width: 18px; height: 18px; accent-color: var(--color-primary); }
        .payment-alert { border-radius: 10px; padding: 12px 14px; font-size: 13px; font-weight: 700; display: flex; gap: 10px; align-items: flex-start; line-height: 1.45; }
        .payment-alert.warn { background: #FFF7ED; color: #9A3412; border: 1px solid #FED7AA; }
        .payment-alert.ok { background: var(--color-success-soft); color: var(--color-success); }
        .payment-alert.error { background: var(--color-danger-soft); color: var(--color-danger); }
        .payment-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; border-top: 1px solid var(--color-border); padding-top: 16px; }
        .payment-status { display: flex; flex-wrap: wrap; gap: 10px; }
        .payment-pill { border-radius: 999px; padding: 7px 10px; font-size: 12px; font-weight: 800; background: var(--color-surface-soft); color: var(--color-text-muted); }
        .payment-pill.ok { background: var(--color-success-soft); color: var(--color-success); }
        @media (max-width: 860px) { .payment-grid, .payment-grid-3 { grid-template-columns: 1fr; } .payment-header, .payment-card-title { flex-direction: column; align-items: stretch; } }
      `}</style>

      <div className="payment-header">
        <div>
          <Link href="/crm/settings" style={{ color: "var(--color-primary)", fontSize: 13, fontWeight: 800 }}>
            Назад к настройкам
          </Link>
          <h1>Настройки платежей</h1>
          <p>Настройки → Платежи → Альфа-Банк. Секретный пароль сохраняется только на сервере и не возвращается в интерфейс.</p>
        </div>
        <CreditCard size={30} color="var(--color-primary)" />
      </div>

      {notice && <div className="payment-alert ok"><CheckCircle2 size={18} />{notice}</div>}
      {error && <div className="payment-alert error"><AlertTriangle size={18} />{error}</div>}

      <form onSubmit={saveSettings} className="payment-card">
        <div className="payment-card-title">
          <div>
            <h2>Альфа-Банк интернет-эквайринг</h2>
            <p>Параметры подключения, возвратов на сайт, СБП и фискализации.</p>
          </div>
          <div className="payment-status">
            <span className={settings.is_enabled ? "payment-pill ok" : "payment-pill"}>{settings.is_enabled ? "Включено" : "Выключено"}</span>
            <span className={passwordConfigured ? "payment-pill ok" : "payment-pill"}>Пароль: {passwordConfigured ? "задан" : "не задан"}</span>
          </div>
        </div>

        {settings.mode === "production" && (
          <div className="payment-alert warn">
            <AlertTriangle size={18} />
            Не используйте production-режим до подтверждения банка.
          </div>
        )}

        {loading ? (
          <div style={{ color: "var(--color-text-muted)", fontSize: 14 }}>Загрузка настроек...</div>
        ) : (
          <>
            <div className="payment-grid">
              <label className="payment-toggle">
                <input type="checkbox" checked={settings.is_enabled} onChange={(event) => setSettings({ ...settings, is_enabled: event.target.checked })} />
                Включить платежи
              </label>
              <Field label="Режим">
                <select className="payment-select" value={settings.mode} onChange={(event) => setSettings({ ...settings, mode: event.target.value as Settings["mode"] })}>
                  <option value="test">test</option>
                  <option value="production">production</option>
                </select>
              </Field>
            </div>

            <div className="payment-grid">
              <Field label="API login">
                <input className="payment-input" value={settings.api_login} onChange={(event) => setSettings({ ...settings, api_login: event.target.value })} placeholder="Логин мерчанта в Альфа-Банке" />
              </Field>
              <Field label="API password" hint="Оставьте поле пустым, чтобы сохранить старый пароль. Сохранённый пароль не показывается.">
                <input className="payment-input" type="password" value={apiPassword} onChange={(event) => setApiPassword(event.target.value)} placeholder={passwordConfigured ? "Пароль уже задан" : "Введите пароль"} autoComplete="new-password" />
              </Field>
            </div>

            <div className="payment-grid">
              <Field label="Тестовый gateway URL">
                <input className="payment-input" value={settings.test_gateway_url} onChange={(event) => setSettings({ ...settings, test_gateway_url: event.target.value })} />
              </Field>
              <Field label="Боевой gateway URL">
                <input className="payment-input" value={settings.production_gateway_url} onChange={(event) => setSettings({ ...settings, production_gateway_url: event.target.value })} />
              </Field>
            </div>

            <div className="payment-grid-3">
              <Field label="Success URL / path">
                <input className="payment-input" value={settings.success_path} onChange={(event) => setSettings({ ...settings, success_path: event.target.value })} />
              </Field>
              <Field label="Fail URL / path">
                <input className="payment-input" value={settings.fail_path} onChange={(event) => setSettings({ ...settings, fail_path: event.target.value })} />
              </Field>
              <Field label="Callback URL / path">
                <input className="payment-input" value={settings.callback_path} onChange={(event) => setSettings({ ...settings, callback_path: event.target.value })} />
              </Field>
            </div>

            <div className="payment-grid-3">
              <Field label="Валюта">
                <input className="payment-input" value="RUB" disabled />
              </Field>
              <Field label="Стадия платежа">
                <select className="payment-select" value={settings.payment_stage} onChange={(event) => setSettings({ ...settings, payment_stage: event.target.value as Settings["payment_stage"] })}>
                  <option value="one_step">one_step</option>
                  <option value="two_step">two_step</option>
                </select>
              </Field>
              <Field label="НДС">
                <select className="payment-select" value={settings.vat_rate || "none"} onChange={(event) => setSettings({ ...settings, vat_rate: event.target.value })}>
                  <option value="none">Без НДС</option>
                  <option value="vat0">НДС 0%</option>
                  <option value="vat10">НДС 10%</option>
                  <option value="vat20">НДС 20%</option>
                </select>
              </Field>
            </div>

            <div className="payment-grid">
              <label className="payment-toggle">
                <input type="checkbox" checked={settings.sbp_enabled} onChange={(event) => setSettings({ ...settings, sbp_enabled: event.target.checked })} />
                СБП включено
              </label>
              <label className="payment-toggle">
                <input type="checkbox" checked={settings.fiscalization_enabled} onChange={(event) => setSettings({ ...settings, fiscalization_enabled: event.target.checked })} />
                Фискализация включена
              </label>
            </div>

            <Field label="Система налогообложения">
              <select className="payment-select" value={settings.taxation_system || ""} onChange={(event) => setSettings({ ...settings, taxation_system: event.target.value })}>
                <option value="">Не указана</option>
                <option value="osn">ОСН</option>
                <option value="usn_income">УСН доходы</option>
                <option value="usn_income_outcome">УСН доходы-расходы</option>
                <option value="patent">Патент</option>
              </select>
            </Field>

            <div className="payment-alert warn">
              <ShieldCheck size={18} />
              Секреты не выводятся после сохранения. Для смены пароля введите новый пароль и сохраните форму.
            </div>

            <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
              Последняя проверка: {lastCheckedAt}
            </div>

            <div className="payment-actions">
              <Button type="button" variant="secondary-crm" onClick={checkSettings} disabled={checking || saving}>
                {checking ? "Проверяем..." : "Проверить настройки"}
              </Button>
              <Button type="submit" variant="primary-crm" disabled={saving || checking}>
                <Save size={16} /> {saving ? "Сохраняем..." : "Сохранить"}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
