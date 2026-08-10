import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("guardian billing ledger contracts", () => {
  const billing = () => read("../../supabase/migrations/20260808000001_billing_accounts_ledger.sql");
  const payroll = () => read("../../supabase/migrations/20260808000002_teacher_payroll.sql");
  const settlement = () => read("../../supabase/migrations/20260808000003_payment_settlement.sql");
  const completion = () => read("../../supabase/migrations/20260808000004_lesson_finance_completion.sql");

  it("stores guardian accounts and signed immutable entries without automatic history backfill", () => {
    const sql = billing();
    expect(sql).toContain("create table public.billing_accounts");
    expect(sql).toContain("unique (organization_id, guardian_id)");
    expect(sql).toContain("create table public.billing_ledger_entries");
    expect(sql).toContain("amount numeric");
    expect(sql).toContain("prevent_billing_ledger_mutation");
    expect(sql).toContain("raise exception 'billing_ledger_is_immutable'");
    expect(sql).not.toMatch(/insert into public\.billing_ledger_entries[\s\S]+from public\.payments/i);
  });

  it("keeps lesson charging disabled by default and policy explicit", () => {
    const sql = billing();
    expect(sql).toContain("billing_enabled boolean not null default false");
    expect(sql).toContain("lesson_price numeric");
    expect(sql).toContain("charge_absent_excused boolean not null default false");
    expect(sql).toContain("charge_absent_unexcused boolean not null default true");
  });

  it("settles a paid payment once against the invoice billing guardian", () => {
    const sql = settlement();
    expect(sql).toContain("settle_paid_payment");
    expect(sql).toContain("for update");
    expect(sql).toContain("target_invoice.guardian_id");
    expect(sql).toContain("on conflict (organization_id, payment_id)");
    expect(sql).toMatch(/entry_type\s*,\s*amount/);
    expect(sql).toMatch(/'payment'\s*,\s*target_payment\.amount/);
    expect(sql).toContain("reconcile_paid_payment");
    expect(sql).toContain("settle_manual_invoice");
    expect(sql).toContain("public.settle_paid_payment(p_organization_id,saved_payment");
    expect(sql).toContain("outstanding:=target_invoice.amount-paid_total");
    expect(sql).toContain("settle_refunded_payment");
    expect(sql).toContain("'refund',-target_payment.amount");
  });

  it("makes lesson debits and payroll snapshots part of completion", () => {
    const sql = completion();
    expect(sql).toContain("create or replace function public.transition_lesson_session");
    expect(sql).toContain("target_session.status = 'completed'");
    expect(sql).toContain("target_session.session_kind <> 'trial'");
    expect(sql).toContain("is_billing_contact = true");
    expect(sql).toContain("attendance_status in ('present', 'late')");
    expect(sql).toContain("source_attendance_id");
    expect(sql).toContain("on conflict (organization_id, lesson_session_id, student_id)");
    expect(sql).toContain("teacher_payroll_entries");
    expect(sql).toContain("ma.status in ('scheduled','completed')");
    expect(sql).toContain("on conflict (organization_id, lesson_session_id, teacher_id)");
  });

  it("snapshots effective per-attendee teacher rates", () => {
    const sql = payroll();
    expect(sql).toContain("create table public.teacher_pay_rules");
    expect(sql).toContain("effective_from date");
    expect(sql).toContain("rate_per_attendee numeric");
    expect(sql).toContain("attendee_count integer");
    expect(sql).toContain("rate_snapshot numeric");
    expect(sql).toContain("amount numeric");
    expect(sql).toContain("check (status in ('accrued', 'approved', 'paid'))");
    expect(sql).toContain("set rate_snapshot=p_rate,amount=payroll.attendee_count*p_rate");
    expect(sql).toContain("then raise exception 'teacher_rate_missing'");
  });
});

describe("paid transition integration", () => {
  it("routes Alfa and both manual-paid entry points through settlement", () => {
    const alfa = read("src/lib/payments/alfabank/status-service.ts");
    const invoices = read("src/app/(crm)/crm/invoices/page.tsx");
    const student = read("src/app/(crm)/crm/students/[studentId]/page.tsx");
    const settleRoute = read("src/app/api/crm/invoices/settle/route.ts");
    expect(alfa).toContain('.rpc("settle_paid_payment"');
    expect(settleRoute).toContain('.rpc("settle_manual_invoice"');
    expect(invoices).toContain('/api/crm/invoices/settle');
    expect(student).toContain('/api/crm/invoices/settle');
    expect(invoices).not.toContain('.from("payments") as any)\n        .insert({');
    expect(student).not.toContain('.from("payments") as any)\n        .insert({');
  });
});
