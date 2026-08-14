type StaffProfileRpcClient = {
  rpc: (name: string) => Promise<{ data: unknown; error: unknown }>;
};

/** Resolve the canonical staff profile for browser/middleware role checks. */
export async function resolveStaffProfileId(
  supabase: StaffProfileRpcClient,
  authUserId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("current_staff_profile_id");
  if (!error && typeof data === "string" && data) return data;

  // Backward compatibility for direct identities while the mapping backfill rolls out.
  return authUserId;
}
