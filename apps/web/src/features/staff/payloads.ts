type StaffDraft = {
  organizationId?: string;
  userId?: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  specialty?: string;
  publicBio?: string;
  internalComment?: string;
  avatarUrl?: string;
  showOnSite?: boolean;
  sortOrder?: string | number;
  payMode?: "per_attendee" | "per_lesson";
  payRate?: string | number;
  payRateEffectiveFrom?: string;
};

export function buildStaffPayload(draft: StaffDraft) {
  return {
    ...(draft.organizationId ? { organizationId: draft.organizationId } : {}),
    ...(draft.userId ? { userId: draft.userId } : {}),
    email: draft.email,
    fullName: draft.fullName,
    phone: draft.phone || "",
    role: draft.role,
    specialty: draft.specialty || "",
    publicBio: draft.publicBio || "",
    internalComment: draft.internalComment || "",
    avatarUrl: draft.avatarUrl || "",
    showOnSite: Boolean(draft.showOnSite),
    sortOrder: Number(draft.sortOrder ?? 100),
  };
}

export function buildTeacherRatePayload(draft: StaffDraft, teacherId: string) {
  if (draft.role !== "teacher" || draft.payRate === "" || draft.payRate == null || !teacherId) return null;
  return {
    teacherId,
    mode: draft.payMode || "per_attendee",
    rate: Number(draft.payRate),
    effectiveFrom: draft.payRateEffectiveFrom || new Date().toISOString().slice(0, 10),
  };
}
