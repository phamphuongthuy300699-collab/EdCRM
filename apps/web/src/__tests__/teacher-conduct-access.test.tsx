import { describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { LessonConductPanel } from "@/features/scheduling/LessonConductPanel";
import { canEditLessonAttendance } from "@/features/scheduling/teacher-portal";

const data = { session: { status: "completed", starts_at: "2026-09-01T12:00:00Z" }, materials: [], homeworkTemplates: [], assignments: [] };
const rows = [{ studentId: "id", studentName: "Ученик", status: "unmarked" as const, comment: "" }];
describe("past lesson editing controls", () => {
  it("allows completed attendance but never another completion", () => {
    render(<LessonConductPanel data={data} rows={rows} readOnly={false} attendanceEditable onRowsChange={vi.fn()} onSaveAttendance={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Был", exact: true })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Сохранить", exact: true })).not.toBeDisabled();
    expect(screen.queryByRole("button", { name: "Завершить занятие" })).not.toBeInTheDocument();
    expect(screen.getByText(/не пересчитывают списания/)).toBeInTheDocument();
    cleanup();
  });
  it("keeps administrator preview read-only", () => {
    render(<LessonConductPanel data={data} rows={rows} readOnly attendanceEditable onRowsChange={vi.fn()} onSaveAttendance={vi.fn()} onAddTrial={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Был", exact: true })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Добавить пробного участника" })).not.toBeInTheDocument();
    cleanup();
  });
  it.each(["cancelled", "moved"])("never enables %s lessons", status => {
    expect(canEditLessonAttendance({ ...data.session, status }, new Date("2026-09-22"))).toBe(false);
  });
  it("enables scheduled lesson exactly when its time arrives", () => {
    const session = { status: "planned", starts_at: "2026-09-22T12:00:00Z" };
    expect(canEditLessonAttendance(session, new Date("2026-09-22T11:59:59Z"))).toBe(false);
    expect(canEditLessonAttendance(session, new Date(session.starts_at))).toBe(true);
  });
});
