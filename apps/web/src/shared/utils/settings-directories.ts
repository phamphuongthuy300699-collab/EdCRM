export type PublicCourseLike = {
  is_public?: boolean;
  is_active?: boolean;
  sort_order?: number | null;
};

export type PublicGroupLike = {
  status?: string | null;
  show_on_site?: boolean;
  capacity?: number | null;
  sort_order?: number | null;
  enrollments?: Array<{ status?: string | null }>;
  branch?: { is_active?: boolean; show_on_site?: boolean } | Array<{ is_active?: boolean; show_on_site?: boolean }>;
};

export function filterPublicCourses<T extends PublicCourseLike>(courses: T[]) {
  return courses
    .filter((course) => course.is_public === true && course.is_active !== false)
    .sort((a, b) => (a.sort_order || 100) - (b.sort_order || 100));
}

export function filterPublicGroups<T extends PublicGroupLike>(groups: T[]) {
  return groups
    .filter((group) => {
      const branch = Array.isArray(group.branch) ? group.branch[0] : group.branch;
      return group.status === "active"
        && group.show_on_site === true
        && (!branch || (branch.is_active !== false && branch.show_on_site !== false));
    })
    .sort((a, b) => (a.sort_order || 100) - (b.sort_order || 100));
}

export function freePlaces(group: PublicGroupLike) {
  const activeEnrollments = group.enrollments?.filter((enrollment) => enrollment.status === "active").length || 0;
  return Math.max(0, Number(group.capacity || 0) - activeEnrollments);
}

export function archiveCoursePayload() {
  return {
    is_active: false,
    is_public: false,
  };
}

export function archiveBranchPayload() {
  return {
    is_active: false,
    show_on_site: false,
  };
}

export function archiveRoomPayload() {
  return {
    is_active: false,
  };
}

export function normalizeScheduleRule(rule: { weekday: number | string; starts_at: string; ends_at: string }) {
  return {
    weekday: Number(rule.weekday),
    starts_at: rule.starts_at.length === 5 ? `${rule.starts_at}:00` : rule.starts_at,
    ends_at: rule.ends_at.length === 5 ? `${rule.ends_at}:00` : rule.ends_at,
  };
}

export function canShowOnlinePayment(settings: { provider?: string; is_enabled?: boolean } | null, secretsConfigured: boolean) {
  return settings?.provider === "alfabank" && settings.is_enabled === true && secretsConfigured;
}

export function validateStaffRole(role: string) {
  return ["owner", "admin", "manager", "teacher", "accountant"].includes(role);
}
