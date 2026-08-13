import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../_shared";

export async function GET() {
  const access = await requireCrmStaff(new Set(["owner", "admin", "manager"]));
  if (!access.ok) return access.response;

  const admin = crmAdmin();
  const { data, error } = await (admin.rpc("crm_followup_queue", { p_organization_id: access.organizationId }) as any);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = data || [];
  const guardianIds = rows.map((row: any) => row.guardian_id).filter(Boolean);
  const studentIds = rows.map((row: any) => row.student_id).filter(Boolean);
  const [{ data: guardians }, { data: students }] = await Promise.all([
    guardianIds.length
      ? (admin.from("guardians") as any).select("id,full_name,phone,status,responsible_manager_id").eq("organization_id", access.organizationId).in("id", guardianIds)
      : Promise.resolve({ data: [] }),
    studentIds.length
      ? (admin.from("students") as any).select("id,full_name,status").eq("organization_id", access.organizationId).in("id", studentIds)
      : Promise.resolve({ data: [] }),
  ]);
  const guardianMap = new Map((guardians || []).map((item: any) => [item.id, item]));
  const studentMap = new Map((students || []).map((item: any) => [item.id, item]));
  return NextResponse.json({
    ok: true,
    followups: rows.map((row: any) => ({
      ...row,
      guardian: guardianMap.get(row.guardian_id) || null,
      student: studentMap.get(row.student_id) || null,
    })),
  });
}
