import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoAuthBypassAllowed } from "@/shared/utils/demo-auth";
import {
  provisionStaffAccessSchema,
  requireStaffAdmin,
  staffIdentityMetadata,
  temporaryPassword,
} from "../_shared";

function isExistingIdentity(error: { code?: string; message?: string }) {
  const message = String(error.message || "").toLowerCase();
  return error.code === "email_exists"
    || error.code === "user_already_exists"
    || message.includes("already registered");
}

export async function POST(request: Request) {
  try {
  const parsed = provisionStaffAccessSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Некорректные данные доступа" }, { status: 400 });
  }
  if (isDemoAuthBypassAllowed()) {
    return NextResponse.json({ ok: true, temporaryPassword: "demo" });
  }

  const access = await requireStaffAdmin();
  if (!access.ok) return access.response;
  const input = parsed.data;
  if (input.organizationId && input.organizationId !== access.organizationId) {
    return NextResponse.json({ ok: false, error: "Недостаточно прав для данной организации" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data: membership, error: membershipError } = await (admin.from("org_memberships") as any)
    .select("role, is_active, profiles(full_name)")
    .eq("organization_id", access.organizationId)
    .eq("user_id", input.staffProfileId)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership?.is_active) {
    return NextResponse.json({ ok: false, error: "Активный сотрудник не найден в этой организации" }, { status: 404 });
  }
  if (access.role !== "owner" && ["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ ok: false, error: "Только владелец может выдать доступ этому сотруднику" }, { status: 403 });
  }

  const { data: existingIdentity } = await (admin.from("staff_auth_identities") as any)
    .select("auth_user_id")
    .eq("organization_id", access.organizationId)
    .eq("staff_profile_id", input.staffProfileId)
    .maybeSingle();
  if (existingIdentity) {
    return NextResponse.json({ ok: false, error: "Доступ в личный кабинет уже создан", code: "STAFF_ACCESS_ALREADY_PROVISIONED" }, { status: 409 });
  }

  const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
  const password = temporaryPassword();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.loginEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: profile?.full_name || "Сотрудник" },
    app_metadata: staffIdentityMetadata(access.organizationId),
  });
  if (createError) {
    if (isExistingIdentity(createError)) {
      return NextResponse.json({
        ok: false,
        error: "Этот email уже используется. Укажите другой Email / логин для ЛК.",
        code: "STAFF_IDENTITY_ALREADY_EXISTS",
      }, { status: 409 });
    }
    throw createError;
  }

  const authUserId = created.user?.id;
  if (!authUserId) throw new Error("Не удалось создать Auth user");
  const { error: mappingError } = await (admin.from("staff_auth_identities") as any).insert({
    organization_id: access.organizationId,
    staff_profile_id: input.staffProfileId,
    auth_user_id: authUserId,
    created_by: access.staffProfileId,
  });
  if (mappingError) {
    await admin.auth.admin.deleteUser(authUserId);
    throw mappingError;
  }

  await (admin.from("crm_audit_log") as any).insert({
    organization_id: access.organizationId,
    actor_id: access.staffProfileId,
    action: "provision_staff_access",
    entity_table: "org_memberships",
    entity_id: input.staffProfileId,
    metadata: { result: "success" },
  });
  return NextResponse.json({ ok: true, temporaryPassword: password });
  } catch (error: any) {
    console.error("Staff access provisioning error:", error);
    return NextResponse.json(
      { ok: false, error: "Не удалось создать доступ сотруднику" },
      { status: 500 },
    );
  }
}
