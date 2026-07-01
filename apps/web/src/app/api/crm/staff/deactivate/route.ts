import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoMode } from "@/shared/utils/demo";
import { requireStaffAdmin, resolveOrganizationId, userIdPayloadSchema } from "../_shared";

export async function POST(request: Request) {
  try {
    const parsed = userIdPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Некорректный userId" }, { status: 400 });
    }

    if (isDemoMode()) {
      return NextResponse.json({ ok: true });
    }

    const access = await requireStaffAdmin();
    if (!access.ok) return access.response;

    const organizationId = await resolveOrganizationId(parsed.data.organizationId || access.organizationId);
    const admin = createSupabaseAdminClient();

    const { error: membershipError } = await (admin.from("org_memberships") as any)
      .update({ is_active: false })
      .eq("organization_id", organizationId)
      .eq("user_id", parsed.data.userId);
    if (membershipError) throw membershipError;

    await (admin.from("profiles") as any)
      .update({ show_on_site: false, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.userId);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Staff deactivate error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Не удалось деактивировать сотрудника" }, { status: 500 });
  }
}
