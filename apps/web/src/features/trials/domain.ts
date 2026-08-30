import type { TrialSubjectInput } from "./contracts";

export function trialSubjectKey(subject: TrialSubjectInput) {
  return "leadId" in subject
    ? `lead:${subject.leadId}`
    : `student:${subject.studentId}`;
}

export function intervalsOverlap(
  firstStart: string | Date,
  firstEnd: string | Date,
  secondStart: string | Date,
  secondEnd: string | Date,
) {
  return (
    new Date(firstStart).getTime() < new Date(secondEnd).getTime() &&
    new Date(firstEnd).getTime() > new Date(secondStart).getTime()
  );
}

export function scheduleCapacityLabel({
  studentCount,
  trialParticipantCount,
  capacity,
}: {
  studentCount: number;
  trialParticipantCount: number;
  capacity: number | null | undefined;
}) {
  const trialPart =
    trialParticipantCount > 0 ? ` + ${trialParticipantCount} пробных` : "";
  const capacityPart = capacity == null ? "" : ` / ${capacity}`;
  return `${studentCount} постоянных${trialPart}${capacityPart}`;
}
