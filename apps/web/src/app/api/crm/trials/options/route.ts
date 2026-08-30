import { NextResponse } from "next/server";
import { crmAdmin, crmMutationRoles, requireCrmStaff } from "../../_shared";

function isoDateOffset(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export async function GET(request: Request) {
  const access = await requireCrmStaff(crmMutationRoles);
  if (!access.ok) return access.response;
  const admin = crmAdmin();
  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("dateFrom") || new Date().toISOString();
  const dateTo = url.searchParams.get("dateTo") || isoDateOffset(14);

  const [
    leadsResult,
    studentsResult,
    teachersResult,
    branchesResult,
    roomsResult,
    sessionsResult,
  ] = await Promise.all([
    admin
      .from("leads")
      .select(
        "id, parent_name, parent_phone, child_name, child_age, status, course_id, courses(title)",
      )
      .eq("organization_id", access.organizationId)
      .in("status", ["new", "contacted", "trial_scheduled", "lost"])
      .is("archived_at", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    admin
      .from("students")
      .select(
        "id, full_name, birth_date, status, enrollments(status, groups(title)), student_guardians(is_primary, guardians(full_name, phone))",
      )
      .eq("organization_id", access.organizationId)
      .neq("status", "archived")
      .is("anonymized_at", null)
      .is("deleted_at", null)
      .order("full_name"),
    admin
      .from("org_memberships")
      .select("user_id, profiles(full_name)")
      .eq("organization_id", access.organizationId)
      .eq("role", "teacher")
      .eq("is_active", true),
    admin
      .from("branches")
      .select("id, name")
      .eq("organization_id", access.organizationId)
      .eq("is_active", true)
      .is("archived_at", null)
      .is("deleted_at", null)
      .order("name"),
    admin
      .from("rooms")
      .select("id, name, branch_id, capacity")
      .eq("organization_id", access.organizationId)
      .eq("is_active", true)
      .is("archived_at", null)
      .is("deleted_at", null)
      .order("name"),
    admin
      .from("lesson_sessions")
      .select(
        "id, group_id, teacher_id, room_id, starts_at, ends_at, status, groups(title, branch_id, capacity, courses(title), branches(name)), profiles(full_name), rooms(name)",
      )
      .eq("organization_id", access.organizationId)
      .in("status", ["planned", "live"])
      .gte("starts_at", dateFrom)
      .lte("starts_at", dateTo)
      .order("starts_at"),
  ]);

  const firstError = [
    leadsResult,
    studentsResult,
    teachersResult,
    branchesResult,
    roomsResult,
    sessionsResult,
  ].find((result) => result.error)?.error;
  if (firstError)
    return NextResponse.json(
      { ok: false, error: "Не удалось загрузить варианты пробной записи" },
      { status: 500 },
    );

  const sessionRows = sessionsResult.data || [];
  const sessionIds = sessionRows.map((session: any) => session.id);
  const groupIds = [
    ...new Set(
      sessionRows.map((session: any) => session.group_id).filter(Boolean),
    ),
  ];
  const [enrollmentsResult, makeupsResult, attachedTrialsResult] =
    await Promise.all([
      groupIds.length
        ? admin
            .from("enrollments")
            .select("group_id, student_id")
            .eq("organization_id", access.organizationId)
            .eq("status", "active")
            .in("group_id", groupIds)
        : Promise.resolve({ data: [], error: null }),
      sessionIds.length
        ? admin
            .from("makeup_assignments")
            .select("target_session_id, student_id")
            .eq("organization_id", access.organizationId)
            .eq("status", "scheduled")
            .in("target_session_id", sessionIds)
        : Promise.resolve({ data: [], error: null }),
      sessionIds.length
        ? admin
            .from("trial_events")
            .select(
              "lesson_session_id, trial_participants(lead_id, student_id, status, leads(student_id, converted_student_id))",
            )
            .eq("organization_id", access.organizationId)
            .eq("mode", "attached_session")
            .in("lesson_session_id", sessionIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (
    enrollmentsResult.error ||
    makeupsResult.error ||
    attachedTrialsResult.error
  ) {
    return NextResponse.json(
      { ok: false, error: "Не удалось рассчитать свободные места" },
      { status: 500 },
    );
  }
  const enrichedSessions = sessionRows.map((session: any) => {
    const enrolledStudentIds = new Set<string>();
    const makeupStudentIds = new Set<string>();
    for (const enrollment of enrollmentsResult.data || [])
      if (enrollment.group_id === session.group_id)
        enrolledStudentIds.add(enrollment.student_id);
    for (const makeup of makeupsResult.data || [])
      if (makeup.target_session_id === session.id)
        makeupStudentIds.add(makeup.student_id);
    const permanentStudentIds = new Set([
      ...enrolledStudentIds,
      ...makeupStudentIds,
    ]);
    const allPeople = new Set(
      [...permanentStudentIds].map((id) => `student:${id}`),
    );
    let trialParticipantCount = 0;
    for (const event of attachedTrialsResult.data || []) {
      if (event.lesson_session_id !== session.id) continue;
      for (const participant of event.trial_participants || []) {
        if (participant.status === "cancelled") continue;
        trialParticipantCount += 1;
        const lead = Array.isArray(participant.leads)
          ? participant.leads[0]
          : participant.leads;
        const linkedStudentId =
          participant.student_id ||
          lead?.student_id ||
          lead?.converted_student_id;
        allPeople.add(
          linkedStudentId
            ? `student:${linkedStudentId}`
            : `lead:${participant.lead_id}`,
        );
      }
    }
    const capacity = session.groups?.capacity ?? null;
    return {
      ...session,
      enrollmentCount: enrolledStudentIds.size,
      makeupCount: [...makeupStudentIds].filter(
        (studentId) => !enrolledStudentIds.has(studentId),
      ).length,
      studentCount: permanentStudentIds.size,
      trialParticipantCount,
      remainingCapacity:
        capacity == null ? null : Math.max(0, capacity - allPeople.size),
    };
  });

  return NextResponse.json({
    ok: true,
    leads: leadsResult.data || [],
    students: studentsResult.data || [],
    teachers: (teachersResult.data || []).map((membership: any) => ({
      id: membership.user_id,
      name:
        (Array.isArray(membership.profiles)
          ? membership.profiles[0]
          : membership.profiles
        )?.full_name || "Преподаватель",
    })),
    branches: branchesResult.data || [],
    rooms: roomsResult.data || [],
    sessions: enrichedSessions,
  });
}
