export async function loadPayrollTeacherNames(
  admin: any,
  organizationId: string,
  teacherIds: Array<string | null | undefined>,
) {
  const ids = [...new Set(teacherIds.filter((id): id is string => Boolean(id)))];
  if (!ids.length) return new Map<string, string>();

  const { data, error } = await admin
    .from("org_memberships")
    .select("user_id, profiles(full_name)")
    .eq("organization_id", organizationId)
    .in("user_id", ids);
  if (error) throw error;

  return new Map<string, string>(
    (data || []).map((membership: any) => {
      const profile = Array.isArray(membership.profiles) ? membership.profiles[0] : membership.profiles;
      return [membership.user_id, profile?.full_name || "Преподаватель"];
    }),
  );
}
