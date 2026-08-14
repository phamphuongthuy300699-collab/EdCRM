import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../../crm/_shared";
import { databaseUuidSchema } from "@/features/scheduling/schemas";

const roles = new Set(["owner", "admin", "teacher"]);

export async function GET(request: Request) {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;
  const admin = crmAdmin();
  const previewTeacherId = new URL(request.url).searchParams.get("previewTeacherId");
  let previewTeacher: { id: string; name: string } | null = null;
  if (previewTeacherId) {
    if (!databaseUuidSchema.safeParse(previewTeacherId).success) return NextResponse.json({ ok: false, error: "Некорректный преподаватель" }, { status: 400 });
    if (!["owner", "admin"].includes(access.role)) return NextResponse.json({ ok: false, error: "Режим просмотра доступен администратору" }, { status: 403 });
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
  } else if (access.role !== "teacher") {
    return NextResponse.json({ ok: false, error: "Укажите преподавателя для просмотра" }, { status: 400 });
  }
  const teacherProfileId = previewTeacherId || access.staffProfileId;
  const { data, error } = await admin.from("teacher_payroll_entries")
    .select("id, pay_mode, attendee_count, rate_snapshot, amount, status, created_at, lesson_sessions(lesson_date, starts_at, groups(title))")
    .eq("organization_id", access.organizationId).eq("teacher_id", teacherProfileId).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, payroll: data || [], previewTeacher });
}
