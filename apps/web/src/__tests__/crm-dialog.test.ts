import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("responsive CRM dialogs", () => {
  it("keeps header, scrolling body and footer inside the viewport", () => {
    const source = read("src/shared/ui/CrmDialog.tsx");
    expect(source).toContain("90dvh");
    expect(source).toContain("95dvh");
    expect(source).toContain("calc(100vw - 32px)");
    expect(source).toContain("overflowY: \"auto\"");
    expect(source).toContain("crm-dialog-footer");
    expect(source).toContain("crm-dialog-actions");
    expect(source).toContain("position: sticky");
    expect(source).toContain("minHeight: 44");
  });

  it("is reused by the main student, group, settings, invoice and schedule overlays", () => {
    for (const file of [
      "src/app/(crm)/crm/students/page.tsx",
      "src/app/(crm)/crm/groups/page.tsx",
      "src/app/(crm)/crm/settings/page.tsx",
      "src/app/(crm)/crm/invoices/page.tsx",
      "src/features/scheduling/ScheduleWorkspace.tsx",
    ]) expect(read(file)).toContain("<CrmDialog");
  });

  it("keeps long-form actions in the shared sticky action zone", () => {
    for (const file of [
      "src/app/(crm)/crm/students/page.tsx",
      "src/app/(crm)/crm/groups/page.tsx",
      "src/app/(crm)/crm/invoices/page.tsx",
      "src/features/scheduling/ScheduleWorkspace.tsx",
    ]) expect(read(file)).toContain("crm-dialog-actions");
    expect(read("src/app/(crm)/crm/settings/page.tsx")).toContain("settings-form-actions");
  });
});
