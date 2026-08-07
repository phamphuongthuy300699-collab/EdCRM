import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../../_shared";
import { studentOperationalState } from "@/features/students/domain";

const pickerRoles = new Set(["owner", "admin", "manager", "accountant"]);

export async function GET(request: Request) {
  const access = await requireCrmStaff(pickerRoles);
  if (!access.ok) return access.response;

  const query = (new URL(request.url).searchParams.get("q")?.trim() || "").slice(0, 100);
  const admin = crmAdmin();
  let candidateStudentIds: string[] | null = null;

  if (query.length >= 2) {
    const phoneDigits = query.replace(/\D/g, "");
    const [{ data: matchingStudents, error: studentSearchError }, { data: guardiansByName, error: guardianNameError }, guardianPhoneResult] = await Promise.all([
      admin.from("students").select("id").eq("organization_id", access.organizationId).is("deleted_at", null).ilike("full_name", `%${query}%`).limit(20),
      admin.from("guardians").select("id").eq("organization_id", access.organizationId).is("deleted_at", null).is("anonymized_at", null).ilike("full_name", `%${query}%`).limit(20),
      phoneDigits.length >= 3
        ? admin.from("guardians").select("id").eq("organization_id", access.organizationId).is("deleted_at", null).is("anonymized_at", null).ilike("phone_normalized", `%${phoneDigits}%`).limit(20)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const guardianSearchError = guardianNameError || guardianPhoneResult.error;
    if (studentSearchError || guardianSearchError) return NextResponse.json({ ok: false, error: studentSearchError?.message || guardianSearchError?.message }, { status: 500 });

    const matchingGuardianIds = [...new Set([...(guardiansByName || []), ...(guardianPhoneResult.data || [])].map((guardian: any) => guardian.id))];
    let guardianStudentIds: string[] = [];
    if (matchingGuardianIds.length) {
      const { data: guardianLinks, error: guardianLinksError } = await admin.from("student_guardians")
        .select("student_id")
        .eq("organization_id", access.organizationId)
        .in("guardian_id", matchingGuardianIds);
      if (guardianLinksError) return NextResponse.json({ ok: false, error: guardianLinksError.message }, { status: 500 });
      guardianStudentIds = (guardianLinks || []).map((link: any) => link.student_id);
    }
    candidateStudentIds = [...new Set([...(matchingStudents || []).map((student: any) => student.id), ...guardianStudentIds])].slice(0, 60);
    if (!candidateStudentIds.length) return NextResponse.json({ ok: true, students: [] });
  }

  let studentsQuery = (admin.from("students") as any)
    .select("id, full_name, status, student_guardians(guardians(full_name, phone)), enrollments(status, group_id, groups(title))")
    .eq("organization_id", access.organizationId)
    .is("deleted_at", null);
  if (candidateStudentIds) studentsQuery = studentsQuery.in("id", candidateStudentIds);
  const { data, error } = await studentsQuery.order("full_name").limit(20);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const students = (data || []).map((student: any) => {
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
