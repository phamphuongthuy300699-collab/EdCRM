import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../../_shared";
import { matchesStudentSearch, studentOperationalState } from "@/features/students/domain";

const pickerRoles = new Set(["owner", "admin", "manager", "accountant"]);

export async function GET(request: Request) {
  const access = await requireCrmStaff(pickerRoles);
  if (!access.ok) return access.response;

  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  const admin = crmAdmin();
  const { data, error } = await (admin.from("students") as any)
    .select("id, full_name, status, student_guardians(guardians(full_name, phone)), enrollments(status, group_id, groups(title))")
    .eq("organization_id", access.organizationId)
    .is("deleted_at", null)
    .order("full_name")
    .limit(100);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const students = (data || [])
    .filter((student: any) => query.length < 2 || matchesStudentSearch({
      full_name: student.full_name,
      guardians: (student.student_guardians || []).map((link: any) => link.guardians).filter(Boolean),
    }, query))
    .slice(0, 20)
    .map((student: any) => {
      const activeEnrollment = (student.enrollments || []).find((enrollment: any) => enrollment.status === "active");
      const state = studentOperationalState(student);
      return {
        id: student.id,
        fullName: student.full_name,
        status: state.status,
        groupId: activeEnrollment?.group_id || null,
        groupName: activeEnrollment?.groups?.title || null,
        withoutGroup: state.withoutGroup,
        guardians: (student.student_guardians || []).map((link: any) => ({
          fullName: link.guardians?.full_name || "",
          phone: link.guardians?.phone || "",
        })),
      };
    });

  return NextResponse.json({ ok: true, students });
}
