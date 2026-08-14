export type StaffIdentityRow = {
  organization_id: string;
  staff_profile_id: string;
};

export type StaffMembershipRow = {
  organization_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
};

export type StaffAuthContext = {
  authUserId: string;
  staffProfileId: string;
  organizationId: string;
  role: string;
};

export function resolveStaffContextFromRows(input: {
  authUserId: string;
  identity: StaffIdentityRow | null;
  memberships: StaffMembershipRow[];
}): StaffAuthContext | null {
  const staffProfileId = input.identity?.staff_profile_id || input.authUserId;
  const matches = input.memberships.filter((membership) => (
    membership.is_active
    && membership.user_id === staffProfileId
    && (!input.identity || membership.organization_id === input.identity.organization_id)
  ));
  if (matches.length !== 1) return null;
  const membership = matches[0];
  return {
    authUserId: input.authUserId,
    staffProfileId,
    organizationId: membership.organization_id,
    role: membership.role,
  };
}

export async function loadStaffAuthContext(admin: any, authUserId: string): Promise<StaffAuthContext | null> {
  const { data: identity, error: identityError } = await admin
    .from("staff_auth_identities")
    .select("organization_id, staff_profile_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (identityError) throw identityError;

  let query = admin
    .from("org_memberships")
    .select("organization_id, user_id, role, is_active")
    .eq("user_id", identity?.staff_profile_id || authUserId)
    .eq("is_active", true);
  if (identity?.organization_id) query = query.eq("organization_id", identity.organization_id);
  const { data: memberships, error: membershipError } = await query;
  if (membershipError) throw membershipError;

  return resolveStaffContextFromRows({
    authUserId,
    identity: identity || null,
    memberships: memberships || [],
  });
}
