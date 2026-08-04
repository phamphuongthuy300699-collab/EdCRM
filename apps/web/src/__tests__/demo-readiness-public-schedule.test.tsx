import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LandingPageClient from "../app/(public)/LandingPageClient";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("public schedule", () => {
  it("renders every rule with its own time and an optional nearest concrete lesson", () => {
    render(<LandingPageClient initialSchedule={[{
      age: "8–10 лет",
      course: "Scratch",
      scheduleLines: ["Пн 12:00–13:30", "Пт 17:00–18:30"],
      nearestLesson: "Ближайшее занятие: 8 августа, 12:00",
      spots: 3,
    }]} />);
    expect(screen.getByText("Пн 12:00–13:30")).toBeInTheDocument();
    expect(screen.getByText("Пт 17:00–18:30")).toBeInTheDocument();
    expect(screen.getByText("Ближайшее занятие: 8 августа, 12:00")).toBeInTheDocument();
  });

  it("loads ends_at and nearest planned/live lesson_sessions on both public schedule surfaces", () => {
    for (const file of ["src/app/(public)/page.tsx", "src/app/(public)/raspisanie/page.tsx"]) {
      const source = read(file);
      expect(source).toContain("ends_at");
      expect(source).toContain('from("lesson_sessions")');
      expect(source).toContain('in("status", ["planned", "live"])');
      expect(source).toContain("formatPublicScheduleRules");
      expect(source).toContain("formatNearestLesson");
    }
  });
});
