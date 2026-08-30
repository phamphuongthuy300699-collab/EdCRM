import { NextResponse } from "next/server";
import { trialCreateSchema } from "@/features/trials/contracts";
import {
  mapTrialRpcError,
  trialParticipantDto,
} from "@/features/trials/server";
import { crmAdmin, crmMutationRoles, requireCrmStaff } from "../_shared";

const readRoles = new Set(["owner", "admin", "manager", "teacher"]);

export async function GET(request: Request) {
  const access = await requireCrmStaff(readRoles);
  if (!access.ok) return access.response;
  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  let query = crmAdmin()
    .from("trial_events")
    .select(
      "id, mode, lesson_session_id, teacher_id, branch_id, room_id, starts_at, ends_at, created_at, profiles(full_name), branches(name), rooms(name), trial_participants(id, trial_event_id, lead_id, student_id, status, result, result_comment, leads(parent_name, child_name), students(full_name))",
    )
    .eq("organization_id", access.organizationId)
    .order("starts_at", { ascending: true, nullsFirst: false });
  if (dateFrom) query = query.gte("starts_at", dateFrom);
  if (dateTo) query = query.lte("starts_at", dateTo);
  if (access.role === "teacher")
    query = query.eq("teacher_id", access.staffProfileId);
  const { data, error } = await query;
  if (error)
    return NextResponse.json(mapTrialRpcError(error).body, { status: 500 });
  return NextResponse.json({
    ok: true,
    trials: (data || []).map((event: any) => ({
      ...event,
      trial_participants: (event.trial_participants || []).map(
        trialParticipantDto,
      ),
    })),
  });
}

export async function POST(request: Request) {
  const access = await requireCrmStaff(crmMutationRoles);
  if (!access.ok) return access.response;
  const parsed = trialCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_TRIAL",
        error: "Проверьте параметры пробного занятия",
      },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const admin = crmAdmin();
  const { data, error } = await admin.rpc("crm_create_trial_event", {
    p_organization_id: access.organizationId,
    p_actor_id: access.staffProfileId,
    p_mode: input.mode,
    p_lesson_session_id:
      input.mode === "attached_session" ? input.lessonSessionId : null,
    p_teacher_id: input.mode === "standalone" ? input.teacherId : null,
    p_branch_id: input.mode === "standalone" ? input.branchId : null,
    p_room_id: input.mode === "standalone" ? (input.roomId ?? null) : null,
    p_starts_at: input.mode === "standalone" ? input.startsAt : null,
    p_ends_at: input.mode === "standalone" ? input.endsAt : null,
    p_participants: input.participants.map((participant) =>
      "leadId" in participant
        ? { lead_id: participant.leadId }
        : { student_id: participant.studentId },
    ),
  });
  if (error) {
    const mapped = mapTrialRpcError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
  return NextResponse.json({ ok: true, result: data }, { status: 201 });
}
