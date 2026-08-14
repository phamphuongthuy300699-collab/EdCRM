import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../../../_shared";
import { databaseUuidSchema } from "@/features/scheduling/schemas";

const roles = new Set(["owner", "admin", "manager", "teacher"]);

export async function GET(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;
  const { sessionId } = await context.params;
  const admin = crmAdmin();
  const previewTeacherId = new URL(request.url).searchParams.get("previewTeacherId");
  if (previewTeacherId) {
    if (!databaseUuidSchema.safeParse(previewTeacherId).success) return NextResponse.json({ ok: false, error: "Некорректный преподаватель" }, { status: 400 });
    if (!["owner", "admin"].includes(access.role)) return NextResponse.json({ ok: false, error: "Режим просмотра доступен администратору" }, { status: 403 });
    const { data: previewMembership } = await admin.from("org_memberships")
      .select("user_id")
      .eq("organization_id", access.organizationId)
      .eq("user_id", previewTeacherId)
      .eq("role", "teacher")
      .eq("is_active", true)
      .maybeSingle();
    if (!previewMembership) return NextResponse.json({ ok: false, error: "Преподаватель не найден" }, { status: 404 });
  }
  const { data: session, error } = await admin.from("lesson_sessions")
    .select("id, group_id, teacher_id, starts_at, ends_at, status, session_kind, materials_unlocked, groups(title), rooms(name)")
    .eq("organization_id", access.organizationId)
    .eq("id", sessionId)
    .single();
  if (error || !session) return NextResponse.json({ ok: false, error: "Занятие не найдено" }, { status: 404 });
  if (previewTeacherId && session.teacher_id !== previewTeacherId) return NextResponse.json({ ok: false, error: "Занятие не найдено" }, { status: 404 });
  if (access.role === "teacher" && session.teacher_id !== access.staffProfileId) return NextResponse.json({ ok: false, error: "Доступно только своё занятие" }, { status: 403 });

  const [{ data: enrollments }, { data: makeups }, { data: attendance }] = await Promise.all([
    admin.from("enrollments").select("student_id, students(id, full_name)").eq("organization_id", access.organizationId).eq("group_id", session.group_id).eq("status", "active"),
    admin.from("makeup_assignments").select("student_id, students(id, full_name)").eq("organization_id", access.organizationId).eq("target_session_id", session.id).in("status", ["scheduled", "completed"]),
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
