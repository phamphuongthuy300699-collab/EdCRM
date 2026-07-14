import { NextResponse } from "next/server";
import { z } from "zod";
import { publishInvoiceForParent } from "@/lib/payments/publish-invoice";
import { crmAdmin, crmFinanceRoles, requireCrmStaff } from "../../_shared";

const createInvoiceSchema = z.object({
  studentId: z.string().uuid(),
  guardianId: z.string().uuid(),
  title: z.string().min(1),
  amount: z.string().or(z.number()),
  dueDate: z.string().min(1),
  discountAssignmentId: z.string().uuid().optional().nullable(),
  publishNow: z.boolean().optional(),
});

export async function POST(request: Request) {
  const access = await requireCrmStaff(crmFinanceRoles);
  if (!access.ok) return access.response;

  const input = createInvoiceSchema.parse(await request.json());
  const admin = crmAdmin();

  const { data: created, error } = await (admin.rpc("crm_create_invoice_with_discount", {
    p_organization_id: access.organizationId,
    p_student_id: input.studentId,
    p_guardian_id: input.guardianId,
    p_title: input.title,
    p_amount: Number(input.amount),
    p_due_date: input.dueDate,
    p_discount_assignment_id: input.discountAssignmentId || null,
    p_created_by: access.userId === "demo-user" ? null : access.userId,
  }) as any);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let paymentLink: any = null;
  if (input.publishNow) {
    paymentLink = await publishInvoiceForParent({
      invoiceId: created.invoice.id,
      origin: new URL(request.url).origin,
      source: "crm_create_invoice_publish_now",
      actorId: access.userId,
    });
  }

  return NextResponse.json({
    ok: true,
    invoice: created.invoice,
    paymentLink,
    studentName: created.studentName,
    guardianName: created.guardianName,
    groupName: created.groupName,
  });
}
