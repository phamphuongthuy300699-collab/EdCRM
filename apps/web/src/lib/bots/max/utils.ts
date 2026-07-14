import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";

const staffRoles = new Set(["owner", "admin", "manager"]);

export function normalizeRuPhone(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  return value ? `+${digits}` : "";
}

export function normalizeMaxVcfInfo(vcfInfo: string | null | undefined) {
  return String(vcfInfo || "").replace(/\\r\\n/g, "\r\n");
}

export function parsePhoneFromMaxVcf(vcfInfo: string | null | undefined) {
  const normalizedVcf = normalizeMaxVcfInfo(vcfInfo);
  const telLine = normalizedVcf
    .split(/\r\n|\n|\r/)
    .find((line) => /^TEL(?:;[^:]*)?:/i.test(line.trim()));
  if (!telLine) return "";

  const rawValue = telLine.slice(telLine.indexOf(":") + 1).trim();
  const phoneValue = rawValue.replace(/^tel:/i, "").replace(/;.*/, "");
  if (!/\d/.test(phoneValue)) return "";
  return normalizeRuPhone(phoneValue);
}

export function verifyMaxContactHash(botToken: string, vcfInfo: string, hash: string) {
  const expected = crypto.createHmac("sha256", botToken).update(vcfInfo).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(hash || "");
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export type GuardianPhoneMatch = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
};

export function findGuardianByVerifiedPhone<T extends GuardianPhoneMatch>(guardians: T[] | null | undefined, verifiedPhone: string) {
  if (!verifiedPhone) return null;
  return (guardians || []).find((guardian) => normalizeRuPhone(guardian.phone) === verifiedPhone) || null;
}

export function newWebhookSecret() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function requireBotStaff() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Необходима авторизация" }, { status: 401 }) };
  }
  const { data: membership } = await (supabase.from("org_memberships") as any)
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!membership?.role || !staffRoles.has(membership.role)) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Недостаточно прав" }, { status: 403 }) };
  }
  return { ok: true as const, userId: user.id, organizationId: membership.organization_id, role: membership.role };
}

export async function canProcessNotificationsWithRequest(request: Request) {
  const cronSecret = process.env.NOTIFICATIONS_CRON_SECRET;
  const provided = request.headers.get("x-cron-secret") || "";
  if (cronSecret && provided && provided === cronSecret) return { ok: true as const, organizationId: null as string | null };

  const access = await requireBotStaff();
  if (!access.ok) return access;
  return { ok: true as const, organizationId: access.organizationId };
}

export async function loadMaxSettingsByOrg(admin: ReturnType<typeof createSupabaseAdminClient>, organizationId: string) {
  const { data } = await (admin.from("bot_settings") as any)
    .select("*")
    .eq("organization_id", organizationId)
    .eq("provider", "max")
    .maybeSingle();
  return data;
}
