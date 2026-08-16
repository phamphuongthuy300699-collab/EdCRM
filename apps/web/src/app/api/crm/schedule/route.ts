import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../_shared";
import { materializeRuleOccurrences } from "@/features/scheduling/domain";
import { enqueueScheduleNotifications } from "@/features/scheduling/server";
import {
  databaseUuidSchema,
  scheduleActionSchema,
  scheduleValidationPayload,
} from "@/features/scheduling/schemas";
import { normalizeMaxEvents } from "@/lib/bots/max/events";
import { mergeTeacherScheduleSessions } from "@/features/scheduling/teacher-portal";

const staffRoles = new Set(["owner", "admin", "manager", "teacher"]);
const adminRoles = new Set(["owner", "admin", "manager"]);

async function loadSession(admin: any, organizationId: string, sessionId: string) {
  const { data, error } = await admin.from("lesson_sessions")
    .select("id, organization_id, group_id, course_id, module_id, lesson_template_id, teacher_id, room_id, starts_at, ends_at, lesson_date, status, session_kind, topic, groups(title)")
    .eq("organization_id", organizationId)
    .eq("id", sessionId)
    .single();
  if (error || !data) throw error || new Error("Занятие не найдено");
  return data;
}

export async function GET(request: Request) {
  const access = await requireCrmStaff(staffRoles);
  if (!access.ok) return access.response;
  const admin = crmAdmin();
  const url = new URL(request.url);
  const previewTeacherId = url.searchParams.get("previewTeacherId");
  let previewTeacher: { id: string; name: string } | null = null;
  if (previewTeacherId) {
    if (!databaseUuidSchema.safeParse(previewTeacherId).success) {
      return NextResponse.json({ ok: false, error: "Некорректный преподаватель" }, { status: 400 });
    }
    if (!["owner", "admin"].includes(access.role)) {
      return NextResponse.json({ ok: false, error: "Режим просмотра доступен администратору" }, { status: 403 });
    }
    const { data: previewMembership } = await admin.from("org_memberships")
      .select("user_id, profiles(full_name)")
      .eq("organization_id", access.organizationId)
      .eq("user_id", previewTeacherId)
      .eq("role", "teacher")
      .eq("is_active", true)
      .maybeSingle();
    if (!previewMembership) return NextResponse.json({ ok: false, error: "Преподаватель не найден" }, { status: 404 });
    const profile = Array.isArray(previewMembership.profiles) ? previewMembership.profiles[0] : previewMembership.profiles;
    previewTeacher = { id: previewTeacherId, name: profile?.full_name || "Преподаватель" };
  }
  const dateFrom = url.searchParams.get("dateFrom") || new Date().toISOString().slice(0, 10);
  const dateTo = url.searchParams.get("dateTo") || new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
  const groupId = url.searchParams.get("groupId");
  const teacherId = url.searchParams.get("teacherId");
  const branchId = url.searchParams.get("branchId");
  const roomId = url.searchParams.get("roomId");
  const status = url.searchParams.get("status");
  const sessionKind = url.searchParams.get("sessionKind");
  let visibleGroupIds: string[] | null = null;
  if (branchId) {
    const { data: branchGroups } = await admin.from("groups").select("id").eq("organization_id", access.organizationId).eq("branch_id", branchId);
    visibleGroupIds = (branchGroups || []).map((group: any) => group.id);
  }
  let query = admin.from("lesson_sessions")
    .select("id, group_id, course_id, teacher_id, room_id, starts_at, ends_at, lesson_date, status, session_kind, change_reason, rescheduled_from_session_id, notification_status, materials_unlocked, groups(title, branch_id), courses(title), profiles(full_name), rooms(name)")
    .eq("organization_id", access.organizationId)
    .gte("lesson_date", dateFrom)
    .lte("lesson_date", dateTo)
    .order("starts_at", { ascending: true });
  if (groupId) query = query.eq("group_id", groupId);
  if (previewTeacherId) query = query.eq("teacher_id", previewTeacherId);
  else if (teacherId) query = query.eq("teacher_id", teacherId);
  if (roomId) query = query.eq("room_id", roomId);
  if (status) query = query.eq("status", status);
  if (sessionKind) query = query.eq("session_kind", sessionKind);
  if (visibleGroupIds) query = visibleGroupIds.length ? query.in("group_id", visibleGroupIds) : query.eq("group_id", "00000000-0000-0000-0000-000000000000");
  if (access.role === "teacher") {
    query = query.eq("teacher_id", access.staffProfileId);
  }
  const { data: calendarSessions, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const portalTeacherId = previewTeacherId || (access.role === "teacher" ? access.staffProfileId : null);
  let unfinishedSessions: any[] = [];
  if (portalTeacherId) {
    const { data, error: unfinishedError } = await admin.from("lesson_sessions")
      .select("id, group_id, course_id, teacher_id, room_id, starts_at, ends_at, lesson_date, status, session_kind, change_reason, rescheduled_from_session_id, notification_status, materials_unlocked, groups(title, branch_id), courses(title), profiles(full_name), rooms(name)")
      .eq("organization_id", access.organizationId)
      .eq("teacher_id", portalTeacherId)
      .eq("status", "live")
      .order("starts_at", { ascending: true });
    if (unfinishedError) return NextResponse.json({ ok: false, error: unfinishedError.message }, { status: 500 });
    unfinishedSessions = data || [];
  }
  const sessions = mergeTeacherScheduleSessions(calendarSessions || [], unfinishedSessions);
  const { data: allMakeups } = await admin.from("makeup_assignments")
    .select("id, student_id, source_attendance_id, target_session_id, status, notes, students(full_name)")
    .eq("organization_id", access.organizationId)
    .in("status", ["requested", "approved", "scheduled"])
    .order("requested_at", { ascending: true });
  const sessionIds = new Set((sessions || []).map((session: any) => session.id));
  const makeups = access.role === "teacher"
    ? (allMakeups || []).filter((makeup: any) => makeup.target_session_id && sessionIds.has(makeup.target_session_id))
    : allMakeups || [];
  const visibleGroupIdList = [...new Set((sessions || []).map((session: any) => session.group_id).filter(Boolean))];
  const { data: activeEnrollments } = visibleGroupIdList.length
    ? await admin.from("enrollments").select("group_id, student_id").eq("organization_id", access.organizationId).eq("status", "active").in("group_id", visibleGroupIdList)
    : { data: [] as any[] };
  const studentsByGroup = new Map<string, Set<string>>();
  for (const enrollment of activeEnrollments || []) {
    if (!studentsByGroup.has(enrollment.group_id)) studentsByGroup.set(enrollment.group_id, new Set());
    studentsByGroup.get(enrollment.group_id)?.add(enrollment.student_id);
  }
  const sessionsWithStudentCount = (sessions || []).map((session: any) => {
    const studentIds = new Set(studentsByGroup.get(session.group_id) || []);
    for (const makeup of allMakeups || []) if (makeup.target_session_id === session.id && makeup.status === "scheduled") studentIds.add(makeup.student_id);
    return { ...session, studentCount: studentIds.size };
  });
  let groupsQuery = admin.from("groups").select("id, title, branch_id, teacher_id, room_id").eq("organization_id", access.organizationId).eq("status", "active").order("title");
  if (previewTeacherId) groupsQuery = groupsQuery.eq("teacher_id", previewTeacherId);
  if (access.role === "teacher") groupsQuery = groupsQuery.eq("teacher_id", access.staffProfileId);
  const [{ data: groups }, { data: teacherMemberships }, { data: branches }, { data: rooms }] = await Promise.all([
    groupsQuery,
    admin.from("org_memberships").select("user_id, profiles(full_name)").eq("organization_id", access.organizationId).eq("role", "teacher").eq("is_active", true),
    admin.from("branches").select("id, name").eq("organization_id", access.organizationId).eq("is_active", true).is("archived_at", null).order("name"),
    admin.from("rooms").select("id, name, branch_id").eq("organization_id", access.organizationId).is("archived_at", null).order("name"),
  ]);
  const teachers = (teacherMemberships || []).map((membership: any) => ({ id: membership.user_id, name: Array.isArray(membership.profiles) ? membership.profiles[0]?.full_name : membership.profiles?.full_name })).filter((teacher: any) => teacher.name);
  const { data: botSettings } = await admin.from("bot_settings").select("settings").eq("organization_id", access.organizationId).eq("provider", "max").maybeSingle();
  return NextResponse.json({ ok: true, sessions: sessionsWithStudentCount, makeups: makeups || [], groups: groups || [], teachers, branches: branches || [], rooms: rooms || [], previewTeacher, notificationEvents: normalizeMaxEvents(botSettings?.settings?.events) });
}

export async function POST(request: Request) {
  const access = await requireCrmStaff(staffRoles);
  if (!access.ok) return access.response;
  const parsed = scheduleActionSchema.safeParse(await request.json());
  if (!parsed.success) {
    const validation = scheduleValidationPayload(parsed.error);
    return NextResponse.json(validation, { status: 400 });
  }
  const input = parsed.data;
  const admin = crmAdmin();
  const teacherActions = new Set(["save_attendance", "start_session", "complete_session"]);
  if (!teacherActions.has(input.action) && !adminRoles.has(access.role)) {
    return NextResponse.json({ ok: false, error: "Операция доступна администратору" }, { status: 403 });
  }

  try {
    if (input.action === "start_session" || input.action === "complete_session") {
      const { data, error } = await admin.rpc("transition_lesson_session", {
        p_organization_id: access.organizationId,
        p_session_id: input.sessionId,
        p_actor_id: access.staffProfileId,
        p_action: input.action === "start_session" ? "start" : "complete",
        p_is_admin: adminRoles.has(access.role),
      });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: error.message.includes("attendance_incomplete") ? 409 : 403 });
      const result = access.role === "teacher" ? { id: data?.id, status: data?.status, unchanged: data?.unchanged } : data;
      return NextResponse.json({ ok: true, result });
    }

    if (input.action === "save_group") {
      const { data, error } = await admin.rpc("save_group_with_schedule", {
        p_organization_id: access.organizationId,
        p_group_id: input.groupId || null,
        p_group: {
          title: input.group.title,
          course_id: input.group.courseId,
          ...(input.group.branchId !== undefined ? { branch_id: input.group.branchId } : {}),
          ...(input.group.roomId !== undefined ? { room_id: input.group.roomId } : {}),
          ...(input.group.teacherId !== undefined ? { teacher_id: input.group.teacherId } : {}),
          ...(input.group.status !== undefined ? { status: input.group.status } : {}),
          ...(input.group.ageFrom !== undefined ? { age_from: input.group.ageFrom } : {}),
          ...(input.group.ageTo !== undefined ? { age_to: input.group.ageTo } : {}),
          ...(input.group.capacity !== undefined ? { capacity: input.group.capacity } : {}),
          ...(input.group.startsOn !== undefined ? { starts_on: input.group.startsOn } : {}),
          ...(input.group.endsOn !== undefined ? { ends_on: input.group.endsOn } : {}),
          ...(input.group.priceMonthly !== undefined ? { price_monthly: input.group.priceMonthly } : {}),
          ...(input.group.billingEnabled !== undefined ? { billing_enabled: input.group.billingEnabled } : {}),
          ...(input.group.lessonPrice !== undefined ? { lesson_price: input.group.lessonPrice } : {}),
          ...(input.group.chargeAbsentExcused !== undefined ? { charge_absent_excused: input.group.chargeAbsentExcused } : {}),
          ...(input.group.chargeAbsentUnexcused !== undefined ? { charge_absent_unexcused: input.group.chargeAbsentUnexcused } : {}),
          ...(input.group.showOnSite !== undefined ? { show_on_site: input.group.showOnSite } : {}),
          ...(input.group.sortOrder !== undefined ? { sort_order: input.group.sortOrder } : {}),
        },
        p_rules: input.rules ?? null,
        p_rebuild_future: input.rebuildFuture,
      });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
      return NextResponse.json({ ok: true, result: data });
    }

    if (input.action === "replace_group_rules") {
      if (!adminRoles.has(access.role)) return NextResponse.json({ ok: false, error: "Операция доступна администратору" }, { status: 403 });
      const { data, error } = await admin.rpc("replace_group_schedule", {
        p_organization_id: access.organizationId,
        p_group_id: input.groupId,
        p_rules: input.rules,
        p_rebuild_future: input.rebuildFuture,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, result: data });
    }

    if (input.action === "create_session") {
      if (new Date(input.endsAt) <= new Date(input.startsAt)) {
        return NextResponse.json({ ok: false, error: "Время окончания должно быть позже начала" }, { status: 400 });
      }
      const { data: group, error: groupError } = await admin.from("groups")
        .select("id, title, course_id, teacher_id, room_id")
        .eq("organization_id", access.organizationId)
        .eq("id", input.groupId)
        .single();
      if (groupError || !group) throw groupError || new Error("Группа не найдена");
      const conflictFilters = [group.teacher_id ? `teacher_id.eq.${group.teacher_id}` : "", group.room_id ? `room_id.eq.${group.room_id}` : ""].filter(Boolean);
      if (conflictFilters.length) {
        const { data: conflicts, error: conflictError } = await admin.from("lesson_sessions")
          .select("id")
          .eq("organization_id", access.organizationId)
          .in("status", ["planned", "live"])
          .lt("starts_at", input.endsAt)
          .gt("ends_at", input.startsAt)
          .or(conflictFilters.join(","))
          .limit(1);
        if (conflictError) throw conflictError;
        if (conflicts?.length) return NextResponse.json({ ok: false, error: "Время пересекается с занятием преподавателя или кабинета" }, { status: 409 });
      }
      const lessonDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(input.startsAt));
      const { data: created, error: createError } = await admin.from("lesson_sessions").insert({
        organization_id: access.organizationId,
        group_id: group.id,
        course_id: group.course_id,
        teacher_id: group.teacher_id,
        room_id: group.room_id,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        lesson_date: lessonDate,
        status: "planned",
        session_kind: input.kind,
        topic: input.topic || null,
        change_reason: input.reason || null,
        notification_status: input.notifyGuardians ? "pending" : "not_required",
      }).select("id").single();
      if (createError || !created) throw createError || new Error("Не удалось создать занятие");
      if (input.notifyGuardians) {
        const queued = await enqueueScheduleNotifications(admin, {
          organizationId: access.organizationId,
          templateKey: "lesson_scheduled",
          lessonSessionId: created.id,
          groupId: group.id,
          payload: { groupTitle: group.title, startsAt: input.startsAt, reason: input.reason || input.topic || undefined },
        });
        if (!queued) await admin.from("lesson_sessions").update({ notification_status: "not_required" }).eq("id", created.id);
      }
      return NextResponse.json({ ok: true, sessionId: created.id });
    }

    if (input.action === "materialize") {
      const [{ data: group, error: groupError }, { data: rules, error: rulesError }] = await Promise.all([
        admin.from("groups").select("id, organization_id, course_id, teacher_id, room_id, starts_on, ends_on").eq("organization_id", access.organizationId).eq("id", input.groupId).single(),
        admin.from("group_schedule_rules").select("id, weekday, starts_at, ends_at").eq("organization_id", access.organizationId).eq("group_id", input.groupId),
      ]);
      if (groupError || !group) throw groupError || new Error("Группа не найдена");
      if (rulesError) throw rulesError;
      const boundedFrom = group.starts_on && group.starts_on > input.dateFrom ? group.starts_on : input.dateFrom;
      const boundedTo = group.ends_on && group.ends_on < input.dateTo ? group.ends_on : input.dateTo;
      const occurrences = boundedFrom <= boundedTo
        ? materializeRuleOccurrences((rules || []).map((rule: any) => ({ id: rule.id, weekday: rule.weekday, startsAt: rule.starts_at, endsAt: rule.ends_at })), boundedFrom, boundedTo)
        : [];
      const rows = occurrences.map((item) => ({
        organization_id: access.organizationId,
        group_id: group.id,
        course_id: group.course_id,
        teacher_id: group.teacher_id,
        room_id: group.room_id,
        schedule_rule_id: item.scheduleRuleId,
        lesson_date: item.lessonDate,
        starts_at: item.startsAt,
        ends_at: item.endsAt,
        status: "planned",
        session_kind: "regular",
      }));
      if (rows.length) {
        const { error } = await admin.from("lesson_sessions").upsert(rows, { onConflict: "group_id,starts_at", ignoreDuplicates: true });
        if (error) throw error;
      }
      return NextResponse.json({ ok: true, materialized: rows.length });
    }

    if (input.action === "reschedule") {
      const source = await loadSession(admin, access.organizationId, input.sessionId);
      const startsAt = new Date(input.startsAt);
      const sourceDuration = source.ends_at ? Math.max(new Date(source.ends_at).getTime() - new Date(source.starts_at).getTime(), 30 * 60000) : 90 * 60000;
      const endsAt = input.endsAt || new Date(startsAt.getTime() + sourceDuration).toISOString();
      const conflictFilters = [source.teacher_id ? `teacher_id.eq.${source.teacher_id}` : "", source.room_id ? `room_id.eq.${source.room_id}` : ""].filter(Boolean);
      if (conflictFilters.length) {
        const { data: conflicts, error: conflictError } = await admin.from("lesson_sessions")
          .select("id")
          .eq("organization_id", access.organizationId)
          .in("status", ["planned", "live"])
          .neq("id", source.id)
          .lt("starts_at", endsAt)
          .gt("ends_at", input.startsAt)
          .or(conflictFilters.join(","))
          .limit(1);
        if (conflictError) throw conflictError;
        if (conflicts?.length) return NextResponse.json({ ok: false, error: "Новое время пересекается с занятием преподавателя или кабинета" }, { status: 409 });
      }
      const { data: createdId, error: rescheduleError } = await admin.rpc("reschedule_lesson_session", {
        p_organization_id: access.organizationId,
        p_session_id: source.id,
        p_starts_at: input.startsAt,
        p_ends_at: endsAt,
        p_reason: input.reason,
      });
      if (rescheduleError || !createdId) throw rescheduleError || new Error("Не удалось создать занятие на новую дату");
      if (input.notifyGuardians) {
        const queued = await enqueueScheduleNotifications(admin, { organizationId: access.organizationId, templateKey: "lesson_rescheduled", lessonSessionId: createdId, groupId: source.group_id, payload: { groupTitle: source.groups?.title, oldStartsAt: source.starts_at, startsAt: input.startsAt, reason: input.reason } });
        if (!queued) await admin.from("lesson_sessions").update({ notification_status: "not_required" }).eq("id", createdId);
      } else await admin.from("lesson_sessions").update({ notification_status: "not_required" }).eq("id", createdId);
      return NextResponse.json({ ok: true, sessionId: createdId, oldStartsAt: source.starts_at });
    }

    if (input.action === "cancel") {
      const session = await loadSession(admin, access.organizationId, input.sessionId);
      if (session.status !== "planned") return NextResponse.json({ ok: false, error: "Отменить можно только предстоящее занятие" }, { status: 409 });
      const { error } = await admin.from("lesson_sessions").update({ status: "cancelled", change_reason: input.reason, cancelled_at: new Date().toISOString(), notification_status: input.notifyGuardians ? "pending" : "not_required" }).eq("organization_id", access.organizationId).eq("id", session.id);
      if (error) throw error;
      if (input.notifyGuardians) {
        const queued = await enqueueScheduleNotifications(admin, { organizationId: access.organizationId, templateKey: "lesson_cancelled", lessonSessionId: session.id, groupId: session.group_id, payload: { groupTitle: session.groups?.title, startsAt: session.starts_at, reason: input.reason } });
        if (!queued) await admin.from("lesson_sessions").update({ notification_status: "not_required" }).eq("id", session.id);
      }
      return NextResponse.json({ ok: true });
    }

    if (input.action === "schedule_makeup") {
      const [{ data: assignment, error: assignmentError }, target] = await Promise.all([
        admin.from("makeup_assignments").select("id, student_id, status, target_session_id").eq("organization_id", access.organizationId).eq("id", input.makeupAssignmentId).single(),
        loadSession(admin, access.organizationId, input.targetSessionId),
      ]);
      if (assignmentError || !assignment) throw assignmentError || new Error("Запрос на отработку не найден");
      if (assignment.status === "scheduled" && assignment.target_session_id === target.id) return NextResponse.json({ ok: true, unchanged: true });
      if (!["requested", "approved", "scheduled"].includes(assignment.status)) return NextResponse.json({ ok: false, error: "Эту отработку уже нельзя переназначить" }, { status: 409 });
      if (target.status !== "planned" || new Date(target.starts_at) <= new Date()) return NextResponse.json({ ok: false, error: "Отработку можно назначить только на предстоящее занятие" }, { status: 409 });
      const { error } = await admin.from("makeup_assignments").update({ target_session_id: target.id, status: "scheduled", notes: input.notes || null, approved_by: access.staffProfileId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("organization_id", access.organizationId).eq("id", assignment.id);
      if (error) throw error;
      await enqueueScheduleNotifications(admin, { organizationId: access.organizationId, templateKey: "makeup_scheduled", lessonSessionId: target.id, studentId: assignment.student_id, payload: { groupTitle: target.groups?.title, startsAt: target.starts_at } });
      return NextResponse.json({ ok: true });
    }

    const { data: saveResult, error: saveError } = await admin.rpc("save_lesson_attendance", {
      p_organization_id: access.organizationId,
      p_session_id: input.sessionId,
      p_actor_id: access.staffProfileId,
      p_is_admin: adminRoles.has(access.role),
      p_records: input.records.map((record) => ({ student_id: record.studentId, status: record.status, comment: record.comment || null, absence_reason: record.absenceReason || null })),
    });
    if (saveError) {
      const forbidden = saveError.message.includes("foreign_teacher_session");
      return NextResponse.json({ ok: false, error: saveError.message }, { status: forbidden ? 403 : 409 });
    }
    const session = await loadSession(admin, access.organizationId, input.sessionId);
    const newAbsenceStudentIds = Array.isArray(saveResult?.new_absence_student_ids) ? saveResult.new_absence_student_ids : [];
    for (const studentId of newAbsenceStudentIds) {
      const record = input.records.find((item) => item.studentId === studentId);
      await enqueueScheduleNotifications(admin, {
        organizationId: access.organizationId,
        templateKey: "attendance_absent",
        lessonSessionId: session.id,
        studentId,
        payload: { groupTitle: session.groups?.title, startsAt: session.starts_at, reason: record?.absenceReason || undefined },
      });
    }
    return NextResponse.json({ ok: true, saved: saveResult?.saved ?? input.records.length });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Не удалось выполнить операцию расписания" }, { status: 500 });
  }
}
