import type { GroupStatus } from "./group-editor";

export type GroupSaveFields = {
  title: string;
  courseId: string;
  branchId?: string | null;
  roomId?: string | null;
  teacherId?: string | null;
  status?: GroupStatus;
  ageFrom?: number | null;
  ageTo?: number | null;
  capacity?: number;
  startsOn?: string | null;
  endsOn?: string | null;
  priceMonthly?: number | null;
  billingEnabled?: boolean;
  lessonPrice?: number | null;
  chargeAbsentExcused?: boolean;
  chargeAbsentUnexcused?: boolean;
  showOnSite?: boolean;
  sortOrder?: number;
};

export type GroupScheduleRuleInput = {
  weekday: number;
  starts_at: string;
  ends_at: string;
};

export function buildGroupSaveOperation(input: {
  groupId?: string | null;
  group: GroupSaveFields;
  rules?: GroupScheduleRuleInput[];
  rebuildFuture: boolean;
}) {
  return {
    action: "save_group" as const,
    ...(input.groupId !== undefined ? { groupId: input.groupId } : {}),
    group: input.group,
    ...(input.rules !== undefined ? {
      rules: input.rules.map((rule) => ({
        weekday: Number(rule.weekday),
        starts_at: rule.starts_at,
        ends_at: rule.ends_at,
      })),
    } : {}),
    rebuildFuture: input.rebuildFuture,
  };
}
