import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../_shared";
import { materializeRuleOccurrences, type AttendanceStatus } from "@/features/scheduling/domain";
import { enqueueScheduleNotifications } from "@/features/scheduling/server";
import { normalizeMaxEvents } from "@/lib/bots/max/events";

const staffRoles = new Set(["owner", "admin", "manager", "teacher"]);
const adminRoles = new Set(["owner", "admin", "manager"]);

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("replace_group_rules"),
    groupId: z.string().uuid(),
    rules: z.array(z.object({ weekday: z.number().int().min(1).max(7), starts_at: z.string(), ends_at: z.string() })),
    rebuildFuture: z.boolean().default(true),
  }),
  z.object({ action: z.literal("materialize"), groupId: z.string().uuid(), dateFrom: z.string(), dateTo: z.string() }),
  z.object({
    action: z.literal("create_session"),
    groupId: z.string().uuid(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    kind: z.enum(["regular", "extra", "trial"]).default("extra"),
    topic: z.string().max(500).optional(),
    reason: z.string().max(500).optional(),
    notifyGuardians: z.boolean().default(true),
  }),
  z.object({ action: z.literal("reschedule"), sessionId: z.string().uuid(), startsAt: z.string().datetime(), endsAt: z.string().datetime().nullable().optional(), reason: z.string().min(1).max(500), notifyGuardians: z.boolean().default(true) }),
  z.object({ action: z.literal("cancel"), sessionId: z.string().uuid(), reason: z.string().min(1).max(500), notifyGuardians: z.boolean().default(true) }),
  z.object({ action: z.literal("schedule_makeup"), makeupAssignmentId: z.string().uuid(), targetSessionId: z.string().uuid(), notes: z.string().max(500).optional() }),
  z.object({
    action: z.literal("save_attendance"),
    sessionId: z.string().uuid(),
    records: z.array(z.object({ studentId: z.string().uuid(), status: z.enum(["unmarked", "present", "late", "absent_excused", "absent_unexcused"]), comment: z.string().max(1000).optional(), absenceReason: z.string().max(500).optional() })),
  }),
]);

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
  const dateFrom = url.searchParams.get("dateFrom") || new Date().toISOString().slice(0, 10);
  const dateTo = url.searchParams.get("dateTo") || new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
  let visibleGroupIds: string[] | null = null;
  let query = admin.from("lesson_sessions")
    .select("id, group_id, course_id, teacher_id, starts_at, ends_at, lesson_date, status, session_kind, change_reason, rescheduled_from_session_id, notification_status, materials_unlocked, groups(title), courses(title), profiles(full_name), rooms(name)")
    .eq("organization_id", access.organizationId)
    .gte("lesson_date", dateFrom)
    .lte("lesson_date", dateTo)
    .order("starts_at", { ascending: true });
  const groupId = url.searchParams.get("groupId");
  if (groupId) query = query.eq("group_id", groupId);
  if (access.role === "teacher") {
    const { data: ownedGroups } = await admin.from("groups").select("id, title").eq("organization_id", access.organizationId).eq("teacher_id", access.userId);
    const ownedIds = (ownedGroups || []).map((group: any) => group.id);
    visibleGroupIds = ownedIds;
    if (!ownedIds.length) return NextResponse.json({ ok: true, sessions: [], makeups: [] });
    query = query.in("group_id", ownedIds);
  }
  const { data: sessions, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const { data: allMakeups } = await admin.from("makeup_assignments")
    .select("id, student_id, source_attendance_id, target_session_id, status, notes, students(full_name)")
    .eq("organization_id", access.organizationId)
    .in("status", ["requested", "approved", "scheduled"])
    .order("requested_at", { ascending: true });
  const sessionIds = new Set((sessions || []).map((session: any) => session.id));
  const makeups = access.role === "teacher"
    ? (allMakeups || []).filter((makeup: any) => makeup.target_session_id && sessionIds.has(makeup.target_session_id))
    : allMakeups || [];
  let groupsQuery = admin.from("groups").select("id, title").eq("organization_id", access.organizationId).eq("status", "active").order("title");
  if (visibleGroupIds) groupsQuery = groupsQuery.in("id", visibleGroupIds);
  const { data: groups } = await groupsQuery;
  const { data: botSettings } = await admin.from("bot_settings").select("settings").eq("organization_id", access.organizationId).eq("provider", "max").maybeSingle();
  return NextResponse.json({ ok: true, sessions: sessions || [], makeups: makeups || [], groups: groups || [], notificationEvents: normalizeMaxEvents(botSettings?.settings?.events) });
}

export async function POST(request: Request) {
  const access = await requireCrmStaff(staffRoles);
  if (!access.ok) return access.response;
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Некорректные данные операции расписания" }, { status: 400 });
  const input = parsed.data;
  const admin = crmAdmin();
  if (input.action !== "save_attendance" && !adminRoles.has(access.role)) {
    return NextResponse.json({ ok: false, error: "Операция доступна администратору" }, { status: 403 });
  }

  try {
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
        admin.from("groups").select("id, organization_id, course_id, teacher_id, room_id").eq("organization_id", access.organizationId).eq("id", input.groupId).single(),
        admin.from("group_schedule_rules").select("id, weekday, starts_at, ends_at").eq("organization_id", access.organizationId).eq("group_id", input.groupId),
      ]);
      if (groupError || !group) throw groupError || new Error("Группа не найдена");
      if (rulesError) throw rulesError;
      const occurrences = materializeRuleOccurrences((rules || []).map((rule: any) => ({ id: rule.id, weekday: rule.weekday, startsAt: rule.starts_at, endsAt: rule.ends_at })), input.dateFrom, input.dateTo);
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
      const { error } = await admin.from("makeup_assignments").update({ target_session_id: target.id, status: "scheduled", notes: input.notes || null, approved_by: access.userId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("organization_id", access.organizationId).eq("id", assignment.id);
      if (error) throw error;
      await enqueueScheduleNotifications(admin, { organizationId: access.organizationId, templateKey: "makeup_scheduled", lessonSessionId: target.id, studentId: assignment.student_id, payload: { groupTitle: target.groups?.title, startsAt: target.starts_at } });
      return NextResponse.json({ ok: true });
    }

    const session = await loadSession(admin, access.organizationId, input.sessionId);
    if (access.role === "teacher" && session.teacher_id !== access.userId) {
      return NextResponse.json({ ok: false, error: "Можно отмечать только свои занятия" }, { status: 403 });
    }
    const rows = input.records.map((record) => ({
      organization_id: access.organizationId,
      group_id: session.group_id,
      lesson_session_id: session.id,
      lesson_date: session.lesson_date || session.starts_at.slice(0, 10),
      student_id: record.studentId,
      attendance_status: record.status as AttendanceStatus,
      is_present: record.status === "present" || record.status === "late",
      comment: record.comment || null,
      absence_reason: record.absenceReason || null,
      marked_by: access.userId,
      marked_at: new Date().toISOString(),
    }));
    const { data: previous } = await admin.from("attendance").select("student_id, attendance_status").eq("organization_id", access.organizationId).eq("lesson_session_id", session.id).in("student_id", input.records.map((record) => record.studentId));
    const previousByStudent = new Map((previous || []).map((record: any) => [record.student_id, record.attendance_status]));
    const { error } = await admin.from("attendance").upsert(rows, { onConflict: "lesson_session_id,student_id" });
    if (error) throw error;
    const completedMakeupStudentIds = input.records.filter((record) => record.status === "present" || record.status === "late").map((record) => record.studentId);
    if (completedMakeupStudentIds.length) {
      const { error: makeupError } = await admin.from("makeup_assignments").update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("organization_id", access.organizationId)
        .eq("target_session_id", session.id)
        .eq("status", "scheduled")
        .in("student_id", completedMakeupStudentIds);
      if (makeupError) throw makeupError;
    }
    for (const record of input.records) {
      const absent = record.status === "absent_excused" || record.status === "absent_unexcused";
      const wasAbsent = previousByStudent.get(record.studentId) === "absent_excused" || previousByStudent.get(record.studentId) === "absent_unexcused";
      if (absent && !wasAbsent) {
        await enqueueScheduleNotifications(admin, {
          organizationId: access.organizationId,
          templateKey: "attendance_absent",
          lessonSessionId: session.id,
          studentId: record.studentId,
          payload: { groupTitle: session.groups?.title, startsAt: session.starts_at, reason: record.absenceReason || undefined },
        });
      }
    }
    return NextResponse.json({ ok: true, saved: rows.length });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Не удалось выполнить операцию расписания" }, { status: 500 });
  }
}
