import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoAuthBypassAllowed } from "@/shared/utils/demo-auth";
import { requireStaffAdmin, resolveOrganizationId, userIdPayloadSchema } from "../_shared";

export async function POST(request: Request) {
  try {
    const parsed = userIdPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Некорректный userId" }, { status: 400 });
    }

    if (isDemoAuthBypassAllowed()) {
      return NextResponse.json({ ok: true });
    }

    const access = await requireStaffAdmin();
    if (!access.ok) return access.response;

    if (parsed.data.organizationId && parsed.data.organizationId !== access.organizationId) {
      return NextResponse.json({ ok: false, error: "Недостаточно прав для данной организации" }, { status: 403 });
    }
    const organizationId = await resolveOrganizationId(access.organizationId);
    const admin = createSupabaseAdminClient();
    const { data: currentMembership } = await (admin.from("org_memberships") as any).select("role").eq("organization_id", organizationId).eq("user_id", parsed.data.userId).eq("is_active", true).maybeSingle();
    if (!currentMembership) return NextResponse.json({ ok: false, error: "Сотрудник не найден в этой организации" }, { status: 404 });
    if (access.role !== "owner" && ["owner", "admin"].includes(currentMembership.role)) return NextResponse.json({ ok: false, error: "Только владелец может отключить этого сотрудника" }, { status: 403 });

    const { error: membershipError } = await (admin.from("org_memberships") as any)
       .update({ is_active: false })
       .eq("organization_id", organizationId)
       .eq("user_id", parsed.data.userId)
       .eq("is_active", true);
     if (membershipError) throw membershipError;

    await (admin.from("crm_audit_log") as any).insert({ organization_id: organizationId, actor_id: access.staffProfileId, action: "deactivate_staff", entity_table: "org_memberships", entity_id: parsed.data.userId, metadata: { previousRole: currentMembership.role, result: "success" } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Staff deactivate error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Не удалось деактивировать сотрудника" }, { status: 500 });
  }
}
