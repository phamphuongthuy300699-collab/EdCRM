import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../../_shared";

const roles = new Set(["owner", "admin", "accountant"]);
const schema = z.object({ invoiceId: z.string().uuid() });

export async function POST(request: Request) {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Некорректный счёт" }, { status: 400 });
  const admin = crmAdmin();
  const { data, error } = await (admin as any).rpc("settle_manual_invoice", {
    p_organization_id: access.organizationId,
    p_invoice_id: parsed.data.invoiceId,
    p_actor_id: access.userId,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 409 });
  return NextResponse.json({ ok: true, result: data });
}
