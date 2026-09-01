import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("canonical student edit API", () => {
  it("uses a narrow authenticated tenant-scoped PATCH", () => {
    const route = read("src/app/api/crm/students/[studentId]/route.ts");
    expect(route).toContain("studentUpdateSchema.safeParse");
    expect(route).toContain("requireCrmStaff(crmMutationRoles)");
    expect(route).toContain('.eq("organization_id", access.organizationId)');
    expect(route).toContain('.is("anonymized_at", null)');
    expect(route).toContain('.is("deleted_at", null)');
    expect(route).toContain("full_name: parsed.data.fullName");
    expect(route).toContain("birth_date: parsed.data.birthDate");
    expect(route).toContain("notes: parsed.data.notes");
    expect(route).toContain("lesson_price: parsed.data.lessonPrice");
    expect(route).toContain("lessonPrice: Number(data.lesson_price)");
  });

  it("does not mix lifecycle or enrollment mutations into profile editing", () => {
    const route = read("src/app/api/crm/students/[studentId]/route.ts");
    expect(route).not.toContain("status: parsed.data");
    expect(route).not.toContain("enrollments");
    expect(route).not.toContain("crm_set_student_enrollment");
    expect(route).not.toContain("parsed.data.organizationId");
    expect(route).not.toContain("p_organization_id");
  });
});
