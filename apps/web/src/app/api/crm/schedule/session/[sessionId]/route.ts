import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../../../_shared";

const roles = new Set(["owner", "admin", "manager", "teacher"]);

export async function GET(_: Request, context: { params: Promise<{ sessionId: string }> }) {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;
  const { sessionId } = await context.params;
  const admin = crmAdmin();
  const { data: session, error } = await admin.from("lesson_sessions")
    .select("id, group_id, teacher_id, starts_at, ends_at, status, session_kind, materials_unlocked, groups(title), rooms(name)")
    .eq("organization_id", access.organizationId)
    .eq("id", sessionId)
    .single();
  if (error || !session) return NextResponse.json({ ok: false, error: "Занятие не найдено" }, { status: 404 });
  if (access.role === "teacher" && session.teacher_id !== access.userId) return NextResponse.json({ ok: false, error: "Доступно только своё занятие" }, { status: 403 });

  const [{ data: enrollments }, { data: makeups }, { data: attendance }] = await Promise.all([
    admin.from("enrollments").select("student_id, students(id, full_name)").eq("organization_id", access.organizationId).eq("group_id", session.group_id).eq("status", "active"),
    admin.from("makeup_assignments").select("student_id, students(id, full_name)").eq("organization_id", access.organizationId).eq("target_session_id", session.id).eq("status", "scheduled"),
    admin.from("attendance").select("id, student_id, attendance_status, comment, absence_reason").eq("organization_id", access.organizationId).eq("lesson_session_id", session.id),
  ]);
  const attendanceByStudent = new Map((attendance || []).map((row: any) => [row.student_id, row]));
  const students = new Map<string, any>();
  for (const enrollment of enrollments || []) {
    const student = Array.isArray(enrollment.students) ? enrollment.students[0] : enrollment.students;
    if (student) students.set(student.id, { ...student, isMakeup: false });
  }
  for (const makeup of makeups || []) {
    const student = Array.isArray(makeup.students) ? makeup.students[0] : makeup.students;
    if (student) students.set(student.id, { ...student, isMakeup: true });
  }
  const rows = [...students.values()].map((student: any) => {
    const mark = attendanceByStudent.get(student.id) as any;
    return { studentId: student.id, studentName: student.full_name, status: mark?.attendance_status || "unmarked", comment: mark?.comment || "", absenceReason: mark?.absence_reason || "", isMakeup: student.isMakeup };
  });
  return NextResponse.json({ ok: true, session, rows });
}
