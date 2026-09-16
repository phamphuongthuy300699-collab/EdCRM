import { describe, expect, it } from "vitest";
import { formatScheduleRules, parseScheduleText } from "@/features/scheduling/group-editor";

describe("weekly schedule editing", () => {
  it("round-trips different times and durations without changing weekly rules", () => {
    const rules = [
      { weekday: 3, starts_at: "18:00:00", ends_at: "19:00:00" },
      { weekday: 6, starts_at: "11:30:00", ends_at: "13:00:00" },
    ];
    expect(parseScheduleText(formatScheduleRules(rules))).toEqual(rules);
  });
  it("keeps each weekday's own time", () => {
    expect(parseScheduleText("Ср 18:00, Сб 11:30")).toEqual([
      { weekday: 3, starts_at: "18:00:00", ends_at: "19:00:00" },
      { weekday: 6, starts_at: "11:30:00", ends_at: "12:30:00" },
    ]);
  });
  it("keeps explicit ninety-minute duration and grouped days", () => {
    expect(parseScheduleText("Вт / Чт 10:00–11:30")).toEqual([
      { weekday: 2, starts_at: "10:00:00", ends_at: "11:30:00" },
      { weekday: 4, starts_at: "10:00:00", ends_at: "11:30:00" },
    ]);
  });
  it.each(["Ср 18:00, Сб", "Ср 18:00–17:00", "Пн 23:30", "Пн 10:00 мусор", "Ср 18:00, Ср 18:00"])("rejects ambiguous or invalid input %s", text => {
    expect(() => parseScheduleText(text)).toThrow();
  });
});
