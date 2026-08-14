import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("secure teacher cabinet preview", () => {
  it("validates and scopes preview targets in every teacher read API", () => {
    for (const relative of [
      "src/app/api/crm/schedule/route.ts",
      "src/app/api/crm/schedule/session/[sessionId]/route.ts",
      "src/app/api/teacher/payroll/route.ts",
    ]) {
      const source = read(relative);
      expect(source).toContain("previewTeacherId");
      expect(source).toContain("databaseUuidSchema.safeParse");
      expect(source).toContain('["owner", "admin"].includes(access.role)');
      expect(source).toContain('.eq("organization_id", access.organizationId)');
      expect(source).toContain('.eq("role", "teacher")');
      expect(source).toContain('.eq("is_active", true)');
    }
  });

  it("renders an explicit read-only administrator preview", () => {
    const page = read("src/app/teacher/page.tsx");
    expect(page).toContain("Режим просмотра администратора");
    expect(page).toContain("previewTeacherId");
    expect(page).toContain("readOnlyPreview");
    expect(page).toContain("!readOnlyPreview && selected.status === \"planned\"");
    expect(page).toContain("disabled={readOnlyPreview || selected.status !== \"live\"}");
  });

  it("offers preview from teacher staff cards", () => {
    const settings = read("src/app/(crm)/crm/settings/page.tsx");
    expect(settings).toContain("Открыть кабинет");
    expect(settings).toContain("/teacher?previewTeacherId=");
  });
});
