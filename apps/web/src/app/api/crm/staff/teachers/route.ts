import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../../_shared";

const roles = new Set(["owner", "admin", "manager"]);

export async function GET() {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;

  const { data, error } = await crmAdmin()
    .from("org_memberships")
    .select("user_id, role, is_active, profiles(full_name)")
    .eq("organization_id", access.organizationId)
    .eq("role", "teacher")
    .eq("is_active", true);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const teachers = (data || []).map((membership: any) => {
    const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
    return {
      user_id: membership.user_id,
      role: "teacher",
      is_active: true,
      full_name: profile?.full_name || "Без имени",
    };
  });
  return NextResponse.json({ ok: true, teachers });
}
