import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("student card editing and honest list", () => {
  it("keeps canonical fields and does not fabricate production data", () => {
    const page = read("src/app/(crm)/crm/students/page.tsx");
    expect(page).toContain("birthDate: s.birth_date || null");
    expect(page).toContain("notes: s.notes || null");
    expect(page).toContain("age: calculateAge(s.birth_date)");
    expect(page).not.toContain('paymentStatus: "paid" as const');
    expect(page).not.toContain('project: s.notes || "Первый проект"');
    expect(page).not.toContain("homeworkProgress: attVal > 80 ? 90 : 70");
  });

  it("offers canonical editing, real contact, history, and trial assignment", () => {
    const page = read("src/app/(crm)/crm/students/page.tsx");
    expect(page).toContain("Редактировать данные ученика");
    expect(page).toContain("/api/crm/students/${selectedStudent.id}");
    expect(page).toContain("/api/crm/interactions?studentId=");
    expect(page).toContain("href={`tel:${student.phone}`}");
    expect(page).toContain("Записать на пробное");
    expect(page).toContain('student.status !== "archived"');
    expect(page).toContain('selectedStudent.status !== "archived"');
  });

  it("keeps status and group changes on their established endpoints", () => {
    const page = read("src/app/(crm)/crm/students/page.tsx");
    expect(page).toContain('fetch("/api/crm/students/status"');
    expect(page).toContain('fetch("/api/crm/students/enrollment"');
  });
});
