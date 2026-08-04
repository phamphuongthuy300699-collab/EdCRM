import { ScheduleWorkspace } from "@/features/scheduling/ScheduleWorkspace";

export default function LessonsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header>
        <h1 style={{ fontSize: "var(--font-h2)", fontFamily: "var(--font-geologica)", color: "var(--color-text)", marginBottom: 4 }}>Расписание и изменения</h1>
        <p style={{ fontSize: "var(--font-small)", color: "var(--color-text-muted)" }}>Единый календарь занятий, переносов, отмен, посещаемости и отработок.</p>
      </header>
      <ScheduleWorkspace />
    </div>
  );
}
