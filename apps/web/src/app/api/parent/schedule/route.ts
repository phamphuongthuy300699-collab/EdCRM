import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";

async function guardianContext() {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return null;
  const admin = createSupabaseAdminClient();
  const { data: link } = await (admin.from("guardian_users") as any).select("guardian_id").eq("user_id", user.id).maybeSingle();
  if (!link?.guardian_id) return null;
  const { data: guardian } = await (admin.from("guardians") as any).select("id, organization_id").eq("id", link.guardian_id).maybeSingle();
  return guardian ? { admin, guardianId: guardian.id as string, organizationId: guardian.organization_id as string } : null;
}

export async function GET() {
  const context = await guardianContext();
  if (!context) return NextResponse.json({ ok: false, error: "Личный кабинет родителя не привязан" }, { status: 401 });
  const { admin, guardianId, organizationId } = context;
  const { data: links, error: linksError } = await (admin.from("student_guardians") as any)
    .select("student_id, students(id, full_name)")
    .eq("guardian_id", guardianId)
    .eq("organization_id", organizationId);
  if (linksError) return NextResponse.json({ ok: false, error: linksError.message }, { status: 500 });
  const studentIds = (links || []).map((link: any) => link.student_id);
  if (!studentIds.length) return NextResponse.json({ ok: true, children: [] });

  const { data: enrollments, error: enrollmentsError } = await (admin.from("enrollments") as any)
    .select("student_id, group_id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .in("student_id", studentIds);
  if (enrollmentsError) return NextResponse.json({ ok: false, error: enrollmentsError.message }, { status: 500 });
  const groupIds = [...new Set((enrollments || []).map((item: any) => item.group_id))];
  const now = new Date();
  const until = new Date(now.getTime() + 45 * 86400000);

  const [{ data: attendance, error: attendanceError }, { data: makeups, error: makeupError }] = await Promise.all([
    (admin.from("attendance") as any)
      .select("id, student_id, lesson_session_id, lesson_date, attendance_status, is_present, absence_reason, comment")
      .eq("organization_id", organizationId)
      .in("student_id", studentIds)
      .order("lesson_date", { ascending: false })
      .limit(80),
    (admin.from("makeup_assignments") as any)
      .select("id, student_id, source_attendance_id, target_session_id, status, notes")
      .eq("organization_id", organizationId)
      .in("student_id", studentIds),
  ]);
  const targetSessionIds = [...new Set((makeups || []).map((makeup: any) => makeup.target_session_id).filter(Boolean))];
  const sessionFilters = [groupIds.length ? `group_id.in.(${groupIds.join(",")})` : "", targetSessionIds.length ? `id.in.(${targetSessionIds.join(",")})` : ""].filter(Boolean);
  const { data: sessions, error: sessionsError } = sessionFilters.length ? await (admin.from("lesson_sessions") as any)
    .select("id, group_id, starts_at, ends_at, status, session_kind, change_reason, rescheduled_from_session_id, groups(title), profiles(full_name), rooms(name)")
    .eq("organization_id", organizationId)
    .or(sessionFilters.join(","))
    .gte("starts_at", new Date(now.getTime() - 7 * 86400000).toISOString())
    .lte("starts_at", until.toISOString())
    .order("starts_at", { ascending: true }) : { data: [], error: null };
  const firstError = sessionsError || attendanceError || makeupError;
  if (firstError) return NextResponse.json({ ok: false, error: firstError.message }, { status: 500 });

  const replaced = new Set((sessions || []).map((session: any) => session.rescheduled_from_session_id).filter(Boolean));
  const visibleSessions = (sessions || []).filter((session: any) => !(session.status === "moved" && replaced.has(session.id)));
  const children = (links || []).map((link: any) => {
    const childGroupIds = new Set((enrollments || []).filter((enrollment: any) => enrollment.student_id === link.student_id).map((enrollment: any) => enrollment.group_id));
    return {
      studentId: link.student_id,
      studentName: link.students?.full_name || "Ребёнок",
      sessions: visibleSessions.filter((session: any) => childGroupIds.has(session.group_id) || (makeups || []).some((makeup: any) => makeup.student_id === link.student_id && makeup.target_session_id === session.id)),
      attendance: (attendance || []).filter((record: any) => record.student_id === link.student_id).slice(0, 8),
      makeups: (makeups || []).filter((makeup: any) => makeup.student_id === link.student_id),
    };
  });
  return NextResponse.json({ ok: true, children });
}

const requestSchema = z.object({ action: z.literal("request_makeup"), attendanceId: z.string().uuid(), notes: z.string().max(500).optional() });

export async function POST(request: Request) {
  const context = await guardianContext();
  if (!context) return NextResponse.json({ ok: false, error: "Личный кабинет родителя не привязан" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Некорректный запрос на отработку" }, { status: 400 });
  const input = parsed.data;
  const { admin, guardianId, organizationId } = context;
  const { data: attendance } = await (admin.from("attendance") as any)
    .select("id, student_id, attendance_status")
    .eq("organization_id", organizationId)
    .eq("id", input.attendanceId)
    .maybeSingle();
  if (!attendance || attendance.attendance_status !== "absent_excused") return NextResponse.json({ ok: false, error: "Отработка доступна только для уважительного пропуска" }, { status: 409 });
  const { data: link } = await (admin.from("student_guardians") as any).select("student_id").eq("guardian_id", guardianId).eq("student_id", attendance.student_id).maybeSingle();
  if (!link) return NextResponse.json({ ok: false, error: "Нет доступа к ученику" }, { status: 403 });
  const { error } = await (admin.from("makeup_assignments") as any).insert({
    organization_id: organizationId,
    source_attendance_id: attendance.id,
    student_id: attendance.student_id,
    status: "requested",
    requested_by_guardian_id: guardianId,
    notes: input.notes || null,
  });
  if (error) return NextResponse.json({ ok: false, error: error.code === "23505" ? "Запрос на эту отработку уже создан" : error.message }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ ok: true });
}
