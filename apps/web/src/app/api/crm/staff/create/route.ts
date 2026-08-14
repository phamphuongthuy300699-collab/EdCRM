import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoAuthBypassAllowed } from "@/shared/utils/demo-auth";
import { requireStaffAdmin, resolveOrganizationId, staffIdentityMetadata, staffPayloadSchema, temporaryPassword } from "../_shared";

export async function POST(request: Request) {
  try {
    const parsed = staffPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Некорректные данные сотрудника", details: parsed.error.format() }, { status: 400 });
    }

    if (isDemoAuthBypassAllowed()) {
      return NextResponse.json({
        ok: true,
        userId: `demo-${Date.now()}`,
        temporaryPassword: "demo",
      });
    }

    const access = await requireStaffAdmin();
    if (!access.ok) return access.response;

    const input = parsed.data;
    if (input.organizationId && input.organizationId !== access.organizationId) {
      return NextResponse.json({ ok: false, error: "Недостаточно прав для данной организации" }, { status: 403 });
    }
    if (access.role !== "owner" && ["owner", "admin"].includes(input.role)) {
      return NextResponse.json({ ok: false, error: "Только владелец может назначать эту роль" }, { status: 403 });
    }
    const organizationId = await resolveOrganizationId(access.organizationId);
    const password = temporaryPassword();
    const admin = createSupabaseAdminClient();

    const { data: authUser, error: createError } = await admin.auth.admin.createUser({
      email: input.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
      },
      app_metadata: staffIdentityMetadata(organizationId),
    });

    if (createError) {
      const isExistingIdentity = createError.code === "email_exists"
        || createError.code === "user_already_exists"
        || createError.message.toLowerCase().includes("already registered");
      if (isExistingIdentity) {
        return NextResponse.json({
          ok: false,
          error: "Этот email уже зарегистрирован. Используйте безопасное приглашение или восстановление доступа.",
          code: "STAFF_IDENTITY_ALREADY_EXISTS",
        }, { status: 409 });
      }
      throw createError;
    }

    const userId = authUser.user?.id || null;
    if (!userId) throw new Error("Не удалось создать Auth user");

    const { error: profileError } = await (admin.from("profiles") as any).upsert({
      id: userId,
      full_name: input.fullName,
      phone: input.phone || null,
      email: input.email,
      avatar_url: input.avatarUrl || null,
      specialty: input.specialty || null,
      public_bio: input.publicBio || null,
      internal_comment: input.internalComment || null,
      show_on_site: input.showOnSite ?? false,
      sort_order: input.sortOrder ?? 100,
      updated_at: new Date().toISOString(),
    });
    if (profileError) throw profileError;

    const { error: membershipError } = await (admin.from("org_memberships") as any).upsert(
      {
        organization_id: organizationId,
        user_id: userId,
        role: input.role,
        is_active: true,
      },
      { onConflict: "organization_id,user_id" },
    );
    if (membershipError) throw membershipError;

    const { error: identityError } = await (admin.from("staff_auth_identities") as any).insert({
      organization_id: organizationId,
      staff_profile_id: userId,
      auth_user_id: userId,
      created_by: access.staffProfileId,
    });
    if (identityError) {
      await (admin.from("org_memberships") as any).delete().eq("organization_id", organizationId).eq("user_id", userId);
      await (admin.from("profiles") as any).delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
      throw identityError;
    }

    await (admin.from("crm_audit_log") as any).insert({ organization_id: organizationId, actor_id: access.staffProfileId, action: "create_staff", entity_table: "org_memberships", entity_id: userId, metadata: { role: input.role, result: "success" } });

    return NextResponse.json({ ok: true, userId, temporaryPassword: password });
  } catch (error: any) {
    console.error("Staff create error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Не удалось создать сотрудника" }, { status: 500 });
  }
}
