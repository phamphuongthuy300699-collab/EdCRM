import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoAuthBypassAllowed } from "@/shared/utils/demo-auth";
import { hasExclusiveStaffIdentityScope, isStaffIdentityOwnedByOrganization, requireStaffAdmin, staffProfileIdPayloadSchema, temporaryPassword } from "../_shared";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const parsed = staffProfileIdPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Некорректный staffProfileId" }, { status: 400 });
    }

    if (isDemoAuthBypassAllowed()) {
      return NextResponse.json({ ok: true, temporaryPassword: "demo" });
    }

    const access = await requireStaffAdmin();
    if (!access.ok) return access.response;
    const rate = checkRateLimit({ key: `staff-password-reset:${access.authUserId}`, limit: 10, windowMs: 10 * 60_000 });
    if (!rate.allowed) return rateLimitResponse(rate);
    if (parsed.data.organizationId && parsed.data.organizationId !== access.organizationId) return NextResponse.json({ ok: false, error: "Недостаточно прав для данной организации" }, { status: 403 });

    const password = temporaryPassword();
    const admin = createSupabaseAdminClient();
    const { data: targetMembership } = await (admin.from("org_memberships") as any).select("role").eq("organization_id", access.organizationId).eq("user_id", parsed.data.staffProfileId).eq("is_active", true).maybeSingle();
    if (!targetMembership) return NextResponse.json({ ok: false, error: "Сотрудник не найден в этой организации" }, { status: 404 });
    if (access.role !== "owner" && ["owner", "admin"].includes(targetMembership.role)) return NextResponse.json({ ok: false, error: "Только владелец может сбросить пароль этого сотрудника" }, { status: 403 });
    const { data: mapping } = await (admin.from("staff_auth_identities") as any)
      .select("auth_user_id")
      .eq("organization_id", access.organizationId)
      .eq("staff_profile_id", parsed.data.staffProfileId)
      .maybeSingle();
    const targetAuthUserId = mapping?.auth_user_id;
    if (!targetAuthUserId) return NextResponse.json({ ok: false, error: "Учётная запись сотрудника не найдена" }, { status: 404 });
    const { data: targetIdentity, error: identityError } = await admin.auth.admin.getUserById(targetAuthUserId);
    if (identityError || !targetIdentity.user) return NextResponse.json({ ok: false, error: "Учётная запись сотрудника не найдена" }, { status: 404 });
    if (!isStaffIdentityOwnedByOrganization(targetIdentity.user, access.organizationId)) {
      return NextResponse.json({ ok: false, error: "Для этой учётной записи доступно только безопасное восстановление пароля", code: "STAFF_IDENTITY_OWNERSHIP_REQUIRED" }, { status: 403 });
    }
    if (!await hasExclusiveStaffIdentityScope(admin, targetAuthUserId, access.organizationId)) {
      return NextResponse.json({ ok: false, error: "Для общей учётной записи доступно только безопасное восстановление пароля", code: "STAFF_IDENTITY_SHARED" }, { status: 403 });
    }
    const { error } = await admin.auth.admin.updateUserById(targetAuthUserId, {
      password,
    });
    if (error) throw error;

    await (admin.from("crm_audit_log") as any).insert({ organization_id: access.organizationId, actor_id: access.staffProfileId, action: "reset_staff_password", entity_table: "org_memberships", entity_id: parsed.data.staffProfileId, metadata: { result: "success" } });

    return NextResponse.json({ ok: true, temporaryPassword: password });
  } catch (error: any) {
    console.error("Staff reset password error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Не удалось сбросить пароль" }, { status: 500 });
  }
}
