import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../../_shared";

const roles = new Set(["owner", "admin", "accountant"]);
const warning = "Исторические оплаты и начальный остаток нельзя учитывать дважды";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("payments"), paymentIds: z.array(z.string().uuid()).min(1).max(100) }),
  z.object({ action: z.literal("lesson"), lessonSessionId: z.string().uuid() }),
  z.object({ action: z.literal("openingBalance"), guardianId: z.string().uuid(), amount: z.number().refine((value) => value !== 0), acknowledgeNoDoubleCount: z.literal(true) }),
]);

export async function POST(request: Request) {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, error: warning }, { status: 400 });
  const input = parsed.data;
  const admin = crmAdmin() as any;

  if (input.action === "lesson") {
    const call = await admin.rpc("reconcile_lesson_finance", { p_organization_id: access.organizationId, p_lesson_session_id: input.lessonSessionId, p_actor_id: access.userId });
    if (call.error) return NextResponse.json({ ok: false, error: call.error.message }, { status: 409 });
    return NextResponse.json({ ok: true, result: call.data });
  }

  if (input.action === "openingBalance") {
    const call = await admin.rpc("apply_billing_adjustment", {
      p_organization_id: access.organizationId,
      p_guardian_id: input.guardianId,
      p_amount: input.amount,
      p_reason: "Начальный остаток при запуске CRM",
      p_actor_id: access.userId,
    });
    if (call.error) return NextResponse.json({ ok: false, error: call.error.message }, { status: 409 });
    return NextResponse.json({ ok: true, warning, result: call.data });
  }

  const results = [];
  for (const paymentId of input.paymentIds) {
    const call = await admin.rpc("reconcile_paid_payment", { p_organization_id: access.organizationId, p_payment_id: paymentId });
    if (call.error) return NextResponse.json({ ok: false, error: call.error.message, paymentId }, { status: 409 });
    results.push(call.data);
  }
  return NextResponse.json({ ok: true, warning, results });
}
