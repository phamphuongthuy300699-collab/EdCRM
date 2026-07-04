import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { staffPayloadSchema, userIdPayloadSchema } from "../app/api/crm/staff/_shared";

describe("staff settings contracts", () => {
  it("accepts PostgreSQL UUID profile ids used by seeded teacher profiles", () => {
    const seededTeacherId = "a4444444-e222-3333-4444-555555555555";

    expect(userIdPayloadSchema.safeParse({ userId: seededTeacherId }).success).toBe(true);
    expect(staffPayloadSchema.safeParse({
      userId: seededTeacherId,
      email: "fedorenko3d@yandex.ru",
      fullName: "Федоренко Сергей",
      phone: "+79508052951",
      role: "teacher",
      sortOrder: 1,
    }).success).toBe(true);
  });

  it("treats an empty userId as a new staff member payload", () => {
    const parsed = staffPayloadSchema.safeParse({
      userId: "",
      email: "new.teacher@example.com",
      fullName: "Новый преподаватель",
      phone: "+79990000000",
      role: "teacher",
      sortOrder: 100,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.userId).toBeUndefined();
    }
  });

  it("offers direct teacher photo upload from the staff editor", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/app/(crm)/crm/settings/page.tsx"),
      "utf8",
    );

    expect(source).toContain("handleStaffAvatarUpload");
    expect(source).toContain('formData.append("folder", "teachers")');
    expect(source).toContain("Загрузить фото");
  });
});
