import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../../_shared";

export async function GET() {
  const access = await requireCrmStaff(new Set(["owner", "admin", "manager"]));
  if (!access.ok) return access.response;
  const { data, error } = await (crmAdmin().from("org_memberships") as any)
    .select("user_id,role,profiles(full_name)")
    .eq("organization_id", access.organizationId)
    .eq("is_active", true)
    .in("role", ["owner", "admin", "manager"]);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({
    ok: true,
    managers: (data || []).map((row: any) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return { id: row.user_id, role: row.role, fullName: profile?.full_name || "Сотрудник" };
    }),
  });
}
