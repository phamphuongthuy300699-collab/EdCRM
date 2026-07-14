import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { normalizeEmail, normalizeRuPhone } from "@/shared/utils/contacts";

const root = path.join(process.cwd(), "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("guardian CRM management", () => {
  it("normalizes Russian phones and emails for duplicate warnings", () => {
    expect(normalizeRuPhone("+7 905 684-60-65")).toBe("+79056846065");
    expect(normalizeRuPhone("8 (905) 684-60-65")).toBe("+79056846065");
    expect(normalizeRuPhone("79056846065")).toBe("+79056846065");
    expect(normalizeEmail(" Parent@MAIL.RU ")).toBe("parent@mail.ru");
  });

  it("extends existing guardian tables instead of creating duplicate parent entities", () => {
    const migration = read("supabase/migrations/20260714000001_guardian_crm_management.sql");

    expect(migration).toContain("alter table public.guardians");
    expect(migration).toContain("phone_normalized");
    expect(migration).toContain("email_normalized");
    expect(migration).toContain("alter table public.student_guardians");
    expect(migration).toContain("is_billing_contact");
    expect(migration).toContain("idx_student_guardians_one_billing_contact");
    expect(migration).toContain("crm_create_student_with_guardians");
    expect(migration.toLowerCase()).not.toContain("create table public.parents");
  });

  it("creates students through a server RPC and supports existing guardians", () => {
    const route = read("apps/web/src/app/api/crm/students/manage/route.ts");
    const page = read("apps/web/src/app/(crm)/crm/students/page.tsx");

    expect(route).toContain("requireCrmStaff");
    expect(route).toContain("crm_create_student_with_guardians");
    expect(route).toContain("guardianId");
    expect(page).toContain("/api/crm/students/manage");
    expect(page).toContain("Выбрать из CRM");
    expect(page).toContain("Получатель счёта");
  });

  it("requires an explicit invoice guardian and does not fallback to first guardian", () => {
    const route = read("apps/web/src/app/api/crm/invoices/create/route.ts");
    const page = read("apps/web/src/app/(crm)/crm/invoices/page.tsx");

    expect(route).toContain("guardianId: z.string().uuid()");
    expect(route).toContain("crm_create_invoice_with_discount");
    expect(page).toContain("selectedGuardianId");
    expect(page).toContain("Выберите получателя счёта");
    expect(page).toContain("/api/crm/invoices/create");
    expect(page).not.toContain("primaryGuardianLink");
    expect(page).not.toContain(".from(\"invoices\") as any).insert");
  });

  it("adds the guardians section and keeps notification worker scoped to MAX pending", () => {
    const layout = read("apps/web/src/app/(crm)/crm/CrmLayoutClient.tsx");
    const worker = read("apps/web/src/app/api/jobs/notifications/process/route.ts");

    expect(layout).toContain("/crm/guardians");
    expect(layout).toContain("Родители");
    expect(worker).toContain('.eq("status", "pending")');
    expect(worker).toContain('.eq("channel", "max")');
  });
});
