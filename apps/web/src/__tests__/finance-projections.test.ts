import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("role-specific finance projections", () => {
  it("provides CRM accounts, payroll and problem workflows", () => {
    const page = read("src/app/(crm)/crm/finance/page.tsx");
    const route = read("src/app/api/crm/finance/route.ts");
    for (const label of ["Лицевые счета", "Начисления преподавателям", "Проблемы"]) expect(page).toContain(label);
    expect(page).toContain("/api/crm/finance");
    expect(page).toContain("Причина корректировки");
    expect(route).toContain('new Set(["owner", "admin", "accountant", "manager"])');
    expect(route).toContain("apply_billing_adjustment");
    expect(route).toContain("transition_teacher_payroll");
  });

  it("shows guardians only their account and teachers only their accruals", () => {
    const parentRoute = read("src/app/api/parent/finance/route.ts");
    const teacherRoute = read("src/app/api/teacher/payroll/route.ts");
    const parentPage = read("src/app/parent/payments/page.tsx");
    const teacherPage = read("src/app/teacher/page.tsx");
    expect(parentRoute).toContain('from("guardian_users")');
    expect(parentRoute).toContain('from("billing_accounts")');
    expect(parentRoute).not.toContain("teacher_payroll_entries");
    expect(teacherRoute).toContain('from("teacher_payroll_entries")');
    expect(teacherRoute).toContain("pay_mode");
    expect(teacherRoute).toContain("access.staffProfileId");
    expect(parentPage).toContain("Текущий баланс");
    expect(teacherPage).toContain("Мои начисления");
    expect(teacherPage).toContain("Фикс за занятие");
  });

  it("projects a student balance through the explicit billing guardian", () => {
    const route = read("src/app/api/crm/students/[studentId]/finance/route.ts");
    expect(route).toContain('eq("is_billing_contact", true)');
    expect(route).toContain('from("billing_accounts")');
    expect(route).not.toContain("student_wallet");
  });

  it("returns real session headcount and counts only canonical active students on dashboard", () => {
    const schedule = read("src/app/api/crm/schedule/route.ts");
    const dashboard = read("src/app/api/crm/dashboard/route.ts");
    expect(schedule).toContain("studentCount");
    expect(schedule).toContain("new Set");
    expect(dashboard).toContain('.eq("status", "active")');
    expect(dashboard).not.toContain('status.is.null');
  });
});
