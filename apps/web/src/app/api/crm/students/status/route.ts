import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../../_shared";

const schema = z.object({ studentId: z.string().uuid(), status: z.enum(["prospect", "active", "paused", "inactive", "archived"]) }).strict();

export async function POST(request: Request) {
  const access = await requireCrmStaff();
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Некорректный статус ученика" }, { status: 400 });
  const { error } = await crmAdmin().from("students").update({ status: parsed.data.status }).eq("organization_id", access.organizationId).eq("id", parsed.data.studentId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
