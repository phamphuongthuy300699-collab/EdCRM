import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../../../../_shared";
import { databaseUuidSchema } from "@/features/scheduling/schemas";
import { assignHomeworkSchema } from "@/features/scheduling/homework-schema";

const roles = new Set(["owner", "admin", "teacher"]);

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;
  const { sessionId } = await context.params;
  if (!databaseUuidSchema.safeParse(sessionId).success) {
    return NextResponse.json({ ok: false, error: "Некорректное занятие" }, { status: 400 });
  }
  const parsed = assignHomeworkSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Проверьте шаблон и срок" }, { status: 400 });

  const admin = crmAdmin();
  const { data: session } = await admin.from("lesson_sessions")
    .select("id, organization_id, group_id, course_id, teacher_id, status")
    .eq("organization_id", access.organizationId)
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return NextResponse.json({ ok: false, error: "Занятие не найдено" }, { status: 404 });
  if (access.role === "teacher" && session.teacher_id !== access.staffProfileId) {
    return NextResponse.json({ ok: false, error: "Доступно только своё занятие" }, { status: 403 });
  }
  if (!["planned", "live"].includes(session.status)) {
    return NextResponse.json({ ok: false, error: "Занятие доступно только для просмотра" }, { status: 409 });
  }

  const { data: template } = await admin.from("homework_templates")
    .select("id, course_id, status")
    .eq("organization_id", access.organizationId)
    .eq("id", parsed.data.homeworkTemplateId)
    .eq("status", "published")
    .maybeSingle();
  if (!template || (template.course_id && template.course_id !== session.course_id)) {
    return NextResponse.json({ ok: false, error: "Шаблон домашнего задания недоступен" }, { status: 404 });
  }

  const { data, error } = await admin.from("homework_assignments").insert({
    organization_id: access.organizationId,
    homework_template_id: template.id,
    group_id: session.group_id,
    lesson_session_id: session.id,
    assigned_by: access.staffProfileId,
    due_at: parsed.data.dueAt ? `${parsed.data.dueAt}T20:59:59.000Z` : null,
    status: "assigned",
  }).select("id, homework_template_id, due_at, status, homework_templates(title)").single();
  if (error) return NextResponse.json({ ok: false, error: "Не удалось назначить домашнее задание" }, { status: 409 });
  return NextResponse.json({ ok: true, assignment: data });
}
