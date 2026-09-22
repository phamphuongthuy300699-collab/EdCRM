import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "@/app/api/crm/_shared";
import { databaseUuidSchema } from "@/features/scheduling/schemas";
import { teacherTrialSchema } from "@/features/trials/teacher-trial-contract";
import { mapTrialRpcError } from "@/features/trials/server";

const roles = new Set(["teacher"]);
type Context = { params: Promise<{ sessionId: string }> };

async function ownLesson(context: Context) {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return { ok: false as const, response: access.response };
  const { sessionId } = await context.params;
  if (!databaseUuidSchema.safeParse(sessionId).success)
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Некорректное занятие" }, { status: 400 }) };
  const admin = crmAdmin();
  const { data: session, error } = await admin.from("lesson_sessions").select("id,status")
    .eq("organization_id", access.organizationId).eq("teacher_id", access.staffProfileId).eq("id", sessionId).maybeSingle();
  if (error) return { ok: false as const, response: NextResponse.json({ ok: false, error: "Не удалось проверить занятие" }, { status: 500 }) };
  if (!session) return { ok: false as const, response: NextResponse.json({ ok: false, error: "Доступно только своё занятие" }, { status: 403 }) };
  if (!["planned", "live"].includes(session.status)) return { ok: false as const, response: NextResponse.json({ ok: false, error: "Пробного участника можно добавить до завершения занятия" }, { status: 409 }) };
  return { ok: true as const, access, admin, sessionId };
}

export async function GET(_request: Request, context: Context) {
  const scoped = await ownLesson(context);
  if (!scoped.ok) return scoped.response;
  const { admin, access } = scoped;
  // Only names needed by the picker; no parent contacts or financial data.
  const [leads, students] = await Promise.all([
    admin.from("leads").select("id,child_name,parent_name").eq("organization_id", access.organizationId)
      .in("status", ["new", "contacted", "trial_scheduled", "lost"]).is("archived_at", null).is("deleted_at", null).order("created_at", { ascending: false }).limit(500),
    admin.from("students").select("id,full_name").eq("organization_id", access.organizationId)
      .neq("status", "archived").is("anonymized_at", null).is("deleted_at", null).order("full_name").limit(500),
  ]);
  if (leads.error || students.error) return NextResponse.json({ ok: false, error: "Не удалось загрузить участников" }, { status: 500 });
  return NextResponse.json({ ok: true, options: [
    ...(leads.data || []).map((lead: any) => ({ id: lead.id, kind: "lead", name: lead.child_name || lead.parent_name || "Заявка", detail: "Лид" })),
    ...(students.data || []).map((student: any) => ({ id: student.id, kind: "student", name: student.full_name, detail: "Ученик" })),
  ] });
}

export async function POST(request: Request, context: Context) {
  const scoped = await ownLesson(context);
  if (!scoped.ok) return scoped.response;
  const parsed = teacherTrialSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Выберите участника или укажите имя нового ребёнка" }, { status: 400 });
  const { admin, access, sessionId } = scoped;
  const input = parsed.data;
  const { data, error } = input.kind === "new"
    ? await admin.rpc("crm_add_teacher_walkin", {
      p_organization_id: access.organizationId, p_actor_id: access.staffProfileId, p_session_id: sessionId,
      p_request_id: input.requestId, p_child_name: input.childName, p_parent_name: input.parentName, p_parent_phone: input.parentPhone,
    })
    : await admin.rpc("crm_create_trial_event", {
      p_organization_id: access.organizationId, p_actor_id: access.staffProfileId,
      p_mode: "attached_session", p_lesson_session_id: sessionId,
      p_teacher_id: null, p_branch_id: null, p_room_id: null, p_starts_at: null, p_ends_at: null,
      p_participants: ["leadId" in input.participant ? { lead_id: input.participant.leadId } : { student_id: input.participant.studentId }],
    });
  if (error) { const mapped = mapTrialRpcError(error); return NextResponse.json(mapped.body, { status: mapped.status }); }
  return NextResponse.json({ ok: true, result: data }, { status: 201 });
}
