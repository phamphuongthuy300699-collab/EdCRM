import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoAuthBypassAllowed } from "@/shared/utils/demo-auth";
import { requireStaffAdmin, temporaryPassword, userIdPayloadSchema } from "../_shared";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  try {
    const parsed = userIdPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Некорректный userId" }, { status: 400 });
    }

    if (isDemoAuthBypassAllowed()) {
      return NextResponse.json({ ok: true, temporaryPassword: "demo" });
    }

    const access = await requireStaffAdmin();
    if (!access.ok) return access.response;
    const rate = checkRateLimit({ key: `staff-password-reset:${access.userId}`, limit: 10, windowMs: 10 * 60_000 });
    if (!rate.allowed) return rateLimitResponse(rate);
    if (parsed.data.organizationId && parsed.data.organizationId !== access.organizationId) return NextResponse.json({ ok: false, error: "Недостаточно прав для данной организации" }, { status: 403 });

    const password = temporaryPassword();
    const admin = createSupabaseAdminClient();
    const { data: targetMembership } = await (admin.from("org_memberships") as any).select("role").eq("organization_id", access.organizationId).eq("user_id", parsed.data.userId).maybeSingle();
    if (!targetMembership) return NextResponse.json({ ok: false, error: "Сотрудник не найден в этой организации" }, { status: 404 });
    if (access.role !== "owner" && ["owner", "admin"].includes(targetMembership.role)) return NextResponse.json({ ok: false, error: "Только владелец может сбросить пароль этого сотрудника" }, { status: 403 });
    const { error } = await admin.auth.admin.updateUserById(parsed.data.userId, {
      password,
    });
    if (error) throw error;

    await (admin.from("crm_audit_log") as any).insert({ organization_id: access.organizationId, actor_id: access.userId, action: "reset_staff_password", entity_table: "org_memberships", entity_id: parsed.data.userId, metadata: { result: "success" } });

    return NextResponse.json({ ok: true, temporaryPassword: password });
  } catch (error: any) {
    console.error("Staff reset password error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Не удалось сбросить пароль" }, { status: 500 });
  }
}
