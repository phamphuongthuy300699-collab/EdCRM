import { NextResponse } from "next/server";
import { databaseUuidSchema } from "@/features/scheduling/schemas";
import { studentUpdateSchema } from "@/features/students/contracts";
import { crmAdmin, crmMutationRoles, requireCrmStaff } from "../../_shared";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ studentId: string }> },
) {
  const access = await requireCrmStaff(crmMutationRoles);
  if (!access.ok) return access.response;

  const { studentId } = await context.params;
  if (!databaseUuidSchema.safeParse(studentId).success) {
    return NextResponse.json(
      { ok: false, error: "Некорректный ученик" },
      { status: 400 },
    );
  }

  const parsed = studentUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Проверьте данные ученика" },
      { status: 400 },
    );
  }

  const { data, error } = await crmAdmin()
    .from("students")
    .update({
      full_name: parsed.data.fullName,
      birth_date: parsed.data.birthDate,
      notes: parsed.data.notes,
      lesson_price: parsed.data.lessonPrice,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", access.organizationId)
    .eq("id", studentId)
    .is("anonymized_at", null)
    .is("deleted_at", null)
    .select("id, full_name, birth_date, notes, lesson_price, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Не удалось сохранить данные ученика" },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Ученик не найден" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    student: {
      id: data.id,
      fullName: data.full_name,
      birthDate: data.birth_date,
      notes: data.notes,
      lessonPrice: Number(data.lesson_price),
      status: data.status,
    },
  });
}
