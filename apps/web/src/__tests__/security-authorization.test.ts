import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("representative BOLA defenses", () => {
  it("scopes CRM student and finance objects to authenticated organization", () => {
    for (const file of [
      "app/api/crm/students/status/route.ts",
      "app/api/crm/students/[studentId]/finance/route.ts",
      "app/api/crm/invoices/settle/route.ts",
      "app/api/crm/schedule/session/[sessionId]/route.ts",
    ]) expect(read(file)).toContain("access.organizationId");
  });

  it("limits teachers to their own lesson and payroll", () => {
    const lesson = read("app/api/crm/schedule/session/[sessionId]/route.ts");
    const payroll = read("app/api/teacher/payroll/route.ts");
    expect(lesson).toContain('access.role === "teacher" && session.teacher_id !== access.userId');
    expect(payroll).toContain('.eq("teacher_id", access.userId)');
  });

  it("derives guardian children/accounts from guardian_users rather than request IDs", () => {
    const schedule = read("app/api/parent/schedule/route.ts");
    const finance = read("app/api/parent/finance/route.ts");
    expect(schedule).toContain('.eq("user_id", user.id)');
    expect(schedule).toContain('.eq("guardian_id", guardianId)');
    expect(finance).toContain('.eq("user_id", user.id)');
    expect(finance).toContain("ownAccounts");
  });

  it("does not allow manager general finance writes or accountant CRM admin writes", () => {
    const finance = read("app/api/crm/finance/route.ts");
    const lifecycle = read("shared/utils/entity-lifecycle.ts");
    expect(finance).toContain('const writeRoles = new Set(["owner", "admin", "accountant"])');
    expect(lifecycle).not.toMatch(/accountant[\s\S]{0,80}(archive|delete|anonymize)/);
  });

  it("never uses staff organizationId from the request as authority", () => {
    for (const file of ["app/api/crm/staff/create/route.ts", "app/api/crm/staff/deactivate/route.ts"]) {
      const source = read(file);
      expect(source).toContain("access.organizationId");
      expect(source).not.toContain("parsed.data.organizationId || access.organizationId");
      expect(source).not.toContain("input.organizationId || access.organizationId");
    }
  });

  it("reserves owner/admin role assignment for owners", () => {
    for (const file of ["app/api/crm/staff/create/route.ts", "app/api/crm/staff/update/route.ts"]) {
      const source = read(file);
      expect(source).toContain('access.role !== "owner"');
      expect(source).toContain('["owner", "admin"].includes(input.role)');
    }
  });

  it("scopes database diagnostics to the authenticated administrator organization", () => {
    const diagnostics = read("app/api/debug/public-data/route.ts");
    expect(diagnostics).toContain('.select("organization_id, role")');
    expect(diagnostics).toContain('.eq("id", membership.organization_id)');
    expect(diagnostics).not.toContain("DEFAULT_ORG_SLUG");
  });

  it("never attaches an existing global Auth identity through staff creation", () => {
    const create = read("app/api/crm/staff/create/route.ts");
    expect(create).not.toContain("listUsers");
    expect(create).toContain("STAFF_IDENTITY_ALREADY_EXISTS");
    expect(create).toContain("staffIdentityMetadata");
  });

  it("requires organization ownership proof before global staff identity mutations", () => {
    for (const file of ["app/api/crm/staff/reset-password/route.ts", "app/api/crm/staff/update/route.ts"]) {
      const source = read(file);
      expect(source).toContain("getUserById");
      expect(source).toContain("isStaffIdentityOwnedByOrganization");
      expect(source).toContain("hasExclusiveStaffIdentityScope");
      expect(source.indexOf("isStaffIdentityOwnedByOrganization")).toBeLessThan(source.indexOf("updateUserById"));
      expect(source.indexOf("hasExclusiveStaffIdentityScope")).toBeLessThan(source.indexOf("updateUserById"));
    }
  });

  it("deactivates only the scoped active membership and leaves the global profile unchanged", () => {
    const deactivate = read("app/api/crm/staff/deactivate/route.ts");
    expect(deactivate).toContain('.eq("is_active", true)');
    expect(deactivate).not.toContain('.from("profiles")');
    expect(deactivate).not.toContain("show_on_site");
  });
});
