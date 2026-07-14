import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../_shared";
import { normalizeEmail, normalizeRuPhone } from "@/shared/utils/contacts";

const guardianSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  status: z.string().optional().default("active"),
  notes: z.string().optional().nullable(),
});

function duplicateWarning(row: any) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
  };
}

export async function GET() {
  const access = await requireCrmStaff(new Set(["owner", "admin", "manager", "accountant"]));
  if (!access.ok) return access.response;

  const admin = crmAdmin();
  const organizationId = access.organizationId;

  const [{ data: guardians, error: guardiansError }, { data: links }, { data: accounts }, { data: invoices }, { data: payments }, { data: portalLinks }] = await Promise.all([
    (admin.from("guardians") as any)
      .select("id, full_name, phone, phone_normalized, email, email_normalized, status, notes, archived_at, deleted_at, anonymized_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("full_name", { ascending: true }),
    (admin.from("student_guardians") as any)
      .select("id, student_id, guardian_id, relation, is_primary, is_billing_contact, students (id, full_name, status)")
      .eq("organization_id", organizationId),
    (admin.from("guardian_messenger_accounts") as any)
      .select("guardian_id, provider, is_verified")
      .eq("organization_id", organizationId)
      .eq("provider", "max"),
    (admin.from("invoices") as any)
      .select("id, guardian_id, status, amount, due_date, title")
      .eq("organization_id", organizationId),
    (admin.from("payments") as any)
      .select("id, guardian_id, status, amount, paid_at")
      .eq("organization_id", organizationId),
    (admin.from("guardian_users") as any)
      .select("guardian_id, user_id")
      .eq("organization_id", organizationId),
  ]);

  if (guardiansError) {
    return NextResponse.json({ ok: false, error: guardiansError.message }, { status: 500 });
  }

  const linksByGuardian = new Map<string, any[]>();
  for (const link of links || []) {
    linksByGuardian.set(link.guardian_id, [...(linksByGuardian.get(link.guardian_id) || []), link]);
  }

  const maxByGuardian = new Map<string, boolean>();
  for (const account of accounts || []) {
    if (account.is_verified) maxByGuardian.set(account.guardian_id, true);
  }

  const portalByGuardian = new Map<string, boolean>();
  for (const link of portalLinks || []) {
    portalByGuardian.set(link.guardian_id, true);
  }

  const invoicesByGuardian = new Map<string, any[]>();
  for (const invoice of invoices || []) {
    if (!invoice.guardian_id) continue;
    invoicesByGuardian.set(invoice.guardian_id, [...(invoicesByGuardian.get(invoice.guardian_id) || []), invoice]);
  }

  const paymentsByGuardian = new Map<string, any[]>();
  for (const payment of payments || []) {
    if (!payment.guardian_id) continue;
    paymentsByGuardian.set(payment.guardian_id, [...(paymentsByGuardian.get(payment.guardian_id) || []), payment]);
  }

  const payableStatuses = new Set(["draft", "issued", "partially_paid", "overdue"]);
  const rows = (guardians || []).map((guardian: any) => {
    const guardianLinks = linksByGuardian.get(guardian.id) || [];
    const guardianInvoices = invoicesByGuardian.get(guardian.id) || [];
    const activeInvoices = guardianInvoices.filter((invoice) => payableStatuses.has(invoice.status));
    const debt = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
    return {
      id: guardian.id,
      fullName: guardian.full_name,
      phone: guardian.phone,
      phoneNormalized: guardian.phone_normalized,
      email: guardian.email,
      emailNormalized: guardian.email_normalized,
      status: guardian.archived_at ? "archived" : guardian.status || "active",
      notes: guardian.notes,
      children: guardianLinks.map((link) => ({
        id: link.student_id,
        fullName: link.students?.full_name || "Без имени",
        status: link.students?.status || "active",
        relation: link.relation,
        isPrimary: Boolean(link.is_primary),
        isBillingContact: Boolean(link.is_billing_contact),
      })),
      childCount: guardianLinks.length,
      portalStatus: portalByGuardian.get(guardian.id) ? "active" : "not_issued",
      maxStatus: maxByGuardian.get(guardian.id) ? "linked" : "not_linked",
      activeInvoiceCount: activeInvoices.length,
      debtAmount: debt,
      invoices: guardianInvoices,
      payments: paymentsByGuardian.get(guardian.id) || [],
    };
  });

  return NextResponse.json({ ok: true, guardians: rows });
}

export async function POST(request: Request) {
  const access = await requireCrmStaff();
  if (!access.ok) return access.response;

  const input = guardianSchema.parse(await request.json());
  const admin = crmAdmin();
  const phoneNormalized = normalizeRuPhone(input.phone);
  const emailNormalized = normalizeEmail(input.email);

  const payload = {
    organization_id: access.organizationId,
    full_name: input.fullName.trim(),
    phone: input.phone?.trim() || null,
    phone_normalized: phoneNormalized,
    email: input.email?.trim() || null,
    email_normalized: emailNormalized,
    status: input.status || "active",
    notes: input.notes?.trim() || null,
  };

  const query = input.id
    ? (admin.from("guardians") as any).update(payload).eq("id", input.id).eq("organization_id", access.organizationId).select().single()
    : (admin.from("guardians") as any).insert(payload).select().single();

  const { data: guardian, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let duplicateQuery = (admin.from("guardians") as any)
    .select("id, full_name, phone, email")
    .eq("organization_id", access.organizationId)
    .is("deleted_at", null);

  if (input.id) duplicateQuery = duplicateQuery.neq("id", input.id);

  const duplicateFilters = [
    phoneNormalized ? `phone_normalized.eq.${phoneNormalized}` : null,
    emailNormalized ? `email_normalized.eq.${emailNormalized}` : null,
  ].filter(Boolean);

  const warnings: any[] = [];
  if (duplicateFilters.length > 0) {
    const { data: duplicates } = await duplicateQuery.or(duplicateFilters.join(","));
    warnings.push(...(duplicates || []).map(duplicateWarning));
  }

  return NextResponse.json({ ok: true, guardian, warnings });
}
