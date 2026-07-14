import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrReuseInvoicePaymentLink } from "@/lib/payments/invoice-payment-links";
import { calculateDiscountedInvoiceAmount } from "@/shared/utils/payments";
import { crmAdmin, crmFinanceRoles, requireCrmStaff } from "../../_shared";

const createInvoiceSchema = z.object({
  studentId: z.string().uuid(),
  guardianId: z.string().uuid(),
  title: z.string().min(1),
  amount: z.string().or(z.number()),
  dueDate: z.string().min(1),
  discount: z.object({
    title: z.string(),
    percent: z.number(),
    discountAssignmentId: z.string().uuid().optional().nullable(),
  }).optional().nullable(),
  publishNow: z.boolean().optional(),
});

export async function POST(request: Request) {
  const access = await requireCrmStaff(crmFinanceRoles);
  if (!access.ok) return access.response;

  const input = createInvoiceSchema.parse(await request.json());
  const admin = crmAdmin();

  const { data: student } = await (admin.from("students") as any)
    .select("id, full_name, status, archived_at, anonymized_at, enrollments (id, status, groups (title))")
    .eq("organization_id", access.organizationId)
    .eq("id", input.studentId)
    .maybeSingle();

  if (!student || student.archived_at || student.anonymized_at || !["active", "paused"].includes(student.status)) {
    return NextResponse.json({ ok: false, error: "Ученик недоступен для выставления счёта" }, { status: 400 });
  }

  const { data: link } = await (admin.from("student_guardians") as any)
    .select("guardian_id, guardians (full_name)")
    .eq("organization_id", access.organizationId)
    .eq("student_id", input.studentId)
    .eq("guardian_id", input.guardianId)
    .maybeSingle();

  if (!link) {
    return NextResponse.json({ ok: false, error: "Выбранный родитель не связан с учеником" }, { status: 400 });
  }

  const activeEnrollment = student.enrollments?.find((item: any) => item.status === "active") || null;
  const amounts = calculateDiscountedInvoiceAmount(String(input.amount), input.discount?.percent || 0);
  if (amounts.baseAmount <= 0) {
    return NextResponse.json({ ok: false, error: "Сумма счёта должна быть больше 0" }, { status: 400 });
  }

  const insertData: any = {
    organization_id: access.organizationId,
    student_id: input.studentId,
    guardian_id: input.guardianId,
    enrollment_id: activeEnrollment?.id || null,
    title: input.title,
    description: input.title,
    amount: amounts.finalAmount,
    currency: "RUB",
    status: "issued",
    due_date: input.dueDate,
    issued_at: new Date().toISOString(),
    created_by: access.userId,
  };

  if (input.discount) {
    insertData.discount_amount = amounts.discountAmount;
    insertData.discount_title = input.discount.title;
    insertData.discount_percent = input.discount.percent;
  }

  const { data: invoice, error } = await (admin.from("invoices") as any).insert(insertData).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  if (input.discount && invoice?.id) {
    const { error: discountError } = await (admin.from("invoice_discounts") as any).insert({
      organization_id: access.organizationId,
      invoice_id: invoice.id,
      discount_assignment_id: input.discount.discountAssignmentId || null,
      title: input.discount.title,
      percent: input.discount.percent,
      amount: amounts.discountAmount,
    });
    if (discountError) return NextResponse.json({ ok: false, error: discountError.message }, { status: 500 });
  }

  let paymentLink: any = null;
  if (input.publishNow) {
    paymentLink = await createOrReuseInvoicePaymentLink(invoice.id);
  }

  return NextResponse.json({
    ok: true,
    invoice,
    paymentLink,
    studentName: student.full_name,
    guardianName: link.guardians?.full_name || "Родитель",
    groupName: activeEnrollment?.groups?.title || "Без группы",
  });
}
