import "server-only";
import type { ScheduleNotificationKey } from "./domain";

export async function enqueueScheduleNotifications(
  admin: any,
  input: {
    organizationId: string;
    templateKey: ScheduleNotificationKey;
    lessonSessionId?: string | null;
    groupId?: string | null;
    studentId?: string | null;
    payload: Record<string, unknown>;
  },
) {
  let studentIds = input.studentId ? [input.studentId] : [];
  if (!studentIds.length && input.groupId) {
    const { data: enrollments, error } = await admin.from("enrollments")
      .select("student_id")
      .eq("organization_id", input.organizationId)
      .eq("group_id", input.groupId)
      .eq("status", "active");
    if (error) throw error;
    studentIds = (enrollments || []).map((row: any) => row.student_id).filter(Boolean);
  }
  if (!studentIds.length) return 0;

  const [{ data: students, error: studentsError }, { data: guardianLinks, error: linksError }] = await Promise.all([
    admin.from("students").select("id, full_name").eq("organization_id", input.organizationId).in("id", studentIds),
    admin.from("student_guardians").select("student_id, guardian_id").eq("organization_id", input.organizationId).in("student_id", studentIds),
  ]);
  if (studentsError) throw studentsError;
  if (linksError) throw linksError;
  const names = new Map((students || []).map((student: any) => [student.id, student.full_name]));
  const seen = new Set<string>();
  const rows = (guardianLinks || []).flatMap((link: any) => {
    const key = `${link.guardian_id}:${link.student_id}:${input.templateKey}:${input.lessonSessionId || ""}`;
    if (!link.guardian_id || seen.has(key)) return [];
    seen.add(key);
    return [{
      organization_id: input.organizationId,
      guardian_id: link.guardian_id,
      student_id: link.student_id,
      lesson_session_id: input.lessonSessionId || null,
      channel: "max",
      destination: null,
      template_key: input.templateKey,
      payload: { ...input.payload, childName: names.get(link.student_id) || "Ребёнок" },
      status: "pending",
    }];
  });
  if (!rows.length) return 0;
  const { error } = await admin.from("notification_outbox").upsert(rows, {
    onConflict: "guardian_id,student_id,lesson_session_id,template_key",
    ignoreDuplicates: true,
  });
  if (error) throw error;
  return rows.length;
}
