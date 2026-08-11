import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoAuthBypassAllowed } from "@/shared/utils/demo-auth";
import { postgresUuidSchema, requireStaffAdmin, resolveOrganizationId, staffPayloadSchema } from "../_shared";

export async function POST(request: Request) {
  try {
    const parsed = staffPayloadSchema.extend({ userId: postgresUuidSchema }).safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Некорректные данные сотрудника", details: parsed.error.format() }, { status: 400 });
    }

    if (isDemoAuthBypassAllowed()) {
      return NextResponse.json({ ok: true });
    }

    const access = await requireStaffAdmin();
    if (!access.ok) return access.response;

    const input = parsed.data;
    if (access.role !== "owner" && ["owner", "admin"].includes(input.role)) {
      return NextResponse.json({ ok: false, error: "Только владелец может назначать эту роль" }, { status: 403 });
    }
    const organizationId = await resolveOrganizationId(access.organizationId);
    const admin = createSupabaseAdminClient();
    const { data: currentMembership } = await (admin.from("org_memberships") as any).select("role").eq("organization_id", organizationId).eq("user_id", input.userId).maybeSingle();
    if (!currentMembership) return NextResponse.json({ ok: false, error: "Сотрудник не найден в этой организации" }, { status: 404 });
    if (access.role !== "owner" && ["owner", "admin"].includes(currentMembership.role)) {
      return NextResponse.json({ ok: false, error: "Только владелец может изменять этого сотрудника" }, { status: 403 });
    }

    try {
      const { error: authError } = await admin.auth.admin.updateUserById(input.userId, {
        email: input.email,
        user_metadata: {
          full_name: input.fullName,
        },
      });
      if (authError) {
        console.warn("Auth user update warning (non-fatal):", authError);
      }
    } catch (e) {
      console.warn("Auth user update exception (non-fatal):", e);
    }

    const { error: profileError } = await (admin.from("profiles") as any).upsert({
      id: input.userId,
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
        user_id: input.userId,
        role: input.role,
        is_active: true,
      },
      { onConflict: "organization_id,user_id" },
    );
    if (membershipError) throw membershipError;

    await (admin.from("crm_audit_log") as any).insert({ organization_id: organizationId, actor_id: access.userId, action: "update_staff", entity_table: "org_memberships", entity_id: input.userId, metadata: { role: input.role, result: "success" } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Staff update error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Не удалось обновить сотрудника" }, { status: 500 });
  }
}
