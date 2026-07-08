import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("parent access management", () => {
  it("issues parent access through auth user and guardian_users without duplicates", () => {
    const source = read("src/app/api/crm/parent-access/issue/route.ts");

    expect(source).toContain("admin.auth.admin.createUser");
    expect(source).toContain("findAuthUserByEmail");
    expect(source).toContain("guardian_users");
    expect(source).toContain('onConflict: "organization_id,guardian_id,user_id"');
    expect(source).toContain("parent_access_issued");
  });

  it("protects parent access actions with staff role check", () => {
    for (const route of ["issue", "reset-password", "disable", "status"]) {
      const source = read(`src/app/api/crm/parent-access/${route}/route.ts`);
      expect(source).toContain("requireParentAccessStaff");
      expect(source).toContain("organizationId !== access.organizationId");
    }

    const shared = read("src/app/api/crm/parent-access/_shared.ts");
    expect(shared).toContain('"owner", "admin", "manager"');
  });

  it("resets password once and disables access by removing guardian link", () => {
    const reset = read("src/app/api/crm/parent-access/reset-password/route.ts");
    const disable = read("src/app/api/crm/parent-access/disable/route.ts");

    expect(reset).toContain("updateUserById");
    expect(reset).toContain("temporaryPassword");
    expect(reset).toContain("parent_access_password_reset");
    expect(disable).toContain(".delete()");
    expect(disable).toContain("parent_access_disabled");
  });

  it("parent production pages do not show demo payments when guardian access is missing", () => {
    const payments = read("src/app/parent/payments/page.tsx");
    const dashboard = read("src/app/parent/page.tsx");

    expect(payments).toContain("Доступ к личному кабинету не привязан");
    expect(payments).not.toContain("setInvoices(demoInvoices);\n          setPayments(demoPayments);");
    expect(dashboard).toContain("Доступ к личному кабинету не привязан");
    expect(dashboard).not.toContain("No linked guardian found");
  });

  it("students page exposes parent access controls and refreshes after lifecycle action", () => {
    const source = read("src/app/(crm)/crm/students/page.tsx");

    expect(source).toContain("/api/crm/parent-access/status");
    expect(source).toContain("/api/crm/parent-access/${action}");
    expect(source).toContain("Выдать доступ");
    expect(source).toContain("Сбросить пароль");
    expect(source).toContain("Отключить доступ");
    expect(source).toContain("setReloadKey((value) => value + 1)");
    expect(source).toContain("guardian_id");
    expect(source).toContain("student_id");
    expect(source).toContain("is_primary");
    expect(source).toContain("relation.is_primary === true");
    expect(source).toContain("guardianId: parentRelation?.guardian_id");
  });
});
