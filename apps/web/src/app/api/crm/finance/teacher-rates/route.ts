import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../../_shared";

const roles = new Set(["owner", "admin", "accountant"]);
const schema = z.object({ teacherId: z.string().uuid(), rate: z.number().nonnegative(), effectiveFrom: z.string().date() }).strict();

export async function POST(request: Request) {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Проверьте ставку и дату" }, { status: 400 });
  const admin = crmAdmin();
  const { data, error } = await (admin as any).rpc("set_teacher_pay_rate", { p_organization_id: access.organizationId, p_teacher_id: parsed.data.teacherId, p_effective_from: parsed.data.effectiveFrom, p_rate: parsed.data.rate, p_actor_id: access.userId });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, id: data });
}
