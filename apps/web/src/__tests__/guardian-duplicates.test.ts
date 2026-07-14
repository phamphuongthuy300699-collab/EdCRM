import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const root = path.join(process.cwd(), "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("guardian duplicate management", () => {
  it("detects duplicate guardian reasons in the guardians API", () => {
    const source = read("apps/web/src/app/api/crm/guardians/route.ts");

    expect(source).toContain("same_phone_normalized");
    expect(source).toContain("same_email_normalized");
    expect(source).toContain("same_name_phone");
    expect(source).toContain("same_name_children");
    expect(source).toContain("isPossibleDuplicate");
  });

  it("merges all guardian foreign keys in one database function", () => {
    const migration = read("supabase/migrations/20260714000002_guardian_duplicate_merge.sql");

    expect(migration).toContain("crm_merge_guardians");
    expect(migration).toContain("public.student_guardians");
    expect(migration).toContain("public.invoices");
    expect(migration).toContain("public.payments");
    expect(migration).toContain("public.discount_assignments");
    expect(migration).toContain("public.guardian_users");
    expect(migration).toContain("public.guardian_messenger_accounts");
    expect(migration).toContain("public.notification_outbox");
    expect(migration).toContain("public.invoice_payment_links");
    expect(migration).toContain("public.leads");
    expect(migration).toContain("crm_audit_log");
    expect(migration).toContain("oldGuardianId");
    expect(migration).toContain("masterGuardianId");
  });

  it("guards merge against cross-organization access on the server", () => {
    const source = read("apps/web/src/app/api/crm/guardians/merge/route.ts");

    expect(source).toContain("requireCrmStaff");
    expect(source).toContain(".eq(\"organization_id\", access.organizationId)");
    expect(source).toContain(".in(\"id\", [input.masterGuardianId, input.duplicateGuardianId])");
    expect(source).toContain("Родители не найдены в вашей организации");
  });

  it("adds the possible duplicates filter and safe merge controls", () => {
    const page = read("apps/web/src/app/(crm)/crm/guardians/page.tsx");

    expect(page).toContain("Возможные дубликаты");
    expect(page).toContain("filter === \"duplicates\"");
    expect(page).toContain("/api/crm/guardians/merge");
    expect(page).toContain("Master guardian");
    expect(page).toContain("Duplicate guardian");
  });

  it("adds debounced grouped global CRM search", () => {
    const layout = read("apps/web/src/app/(crm)/crm/CrmLayoutClient.tsx");
    const route = read("apps/web/src/app/api/crm/search/route.ts");

    expect(layout).toContain("setTimeout");
    expect(layout).toContain("300");
    expect(layout).toContain("/api/crm/search");
    expect(layout).toContain("Ученики");
    expect(layout).toContain("Родители");
    expect(route).toContain("students");
    expect(route).toContain("guardians");
    expect(route).toContain("invoices");
    expect(route).toContain("groups");
  });
});
