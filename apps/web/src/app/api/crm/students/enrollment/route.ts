import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../../_shared";

const schema = z.object({ studentId: z.string().uuid(), groupId: z.string().uuid().nullable() });

export async function POST(request: Request) {
  const access = await requireCrmStaff();
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Некорректные данные зачисления" }, { status: 400 });

  const admin = crmAdmin();
  const { data, error } = await admin.rpc("crm_set_student_enrollment", {
    p_organization_id: access.organizationId,
    p_student_id: parsed.data.studentId,
    p_group_id: parsed.data.groupId,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, result: data });
}
