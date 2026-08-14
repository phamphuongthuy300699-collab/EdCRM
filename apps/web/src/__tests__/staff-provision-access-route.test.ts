import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { requireStaffAdmin } from "@/app/api/crm/staff/_shared";
import { POST } from "@/app/api/crm/staff/provision-access/route";

vi.mock("@/shared/db/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/shared/utils/demo-auth", () => ({
  isDemoAuthBypassAllowed: () => false,
}));

vi.mock("@/app/api/crm/staff/_shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/api/crm/staff/_shared")>();
  return {
    ...actual,
    requireStaffAdmin: vi.fn(),
    temporaryPassword: () => "Temporary-Password-1!",
  };
});

const organizationId = "11111111-1111-4111-8111-111111111111";
const ownerProfileId = "22222222-2222-4222-8222-222222222222";
const legacyProfileId = "a2222222-e222-3333-4444-555555555555";
const authUserId = "33333333-3333-4333-8333-333333333333";

function request(loginEmail = "legacy.portal@example.invalid") {
  return new Request("http://localhost/api/crm/staff/provision-access", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ organizationId, staffProfileId: legacyProfileId, loginEmail }),
  });
}

function adminClient(createError: any = null) {
  const mappingInsert = vi.fn().mockResolvedValue({ error: null });
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    if (table === "org_memberships") {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { role: "teacher", is_active: true, profiles: { full_name: "Legacy teacher" } },
          error: null,
        }),
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      return query;
    }
    if (table === "staff_auth_identities") {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: mappingInsert,
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      return query;
    }
    if (table === "crm_audit_log") return { insert: auditInsert };
    throw new Error(`Unexpected table ${table}`);
  });
  const createUser = vi.fn().mockResolvedValue(
    createError
      ? { data: { user: null }, error: createError }
      : { data: { user: { id: authUserId } }, error: null },
  );
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  return {
    client: { from, auth: { admin: { createUser, deleteUser } } },
    mappingInsert,
    auditInsert,
    createUser,
    deleteUser,
  };
}

describe("legacy staff access provisioning route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireStaffAdmin).mockResolvedValue({
      ok: true,
      authUserId: ownerProfileId,
      staffProfileId: ownerProfileId,
      organizationId,
      role: "owner",
    });
  });

  it("creates a distinct Auth identity and mapping without duplicating the staff profile", async () => {
    const admin = adminClient();
    vi.mocked(createSupabaseAdminClient).mockReturnValue(admin.client as any);

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      temporaryPassword: "Temporary-Password-1!",
    });
    expect(admin.createUser).toHaveBeenCalledWith(expect.objectContaining({
      email: "legacy.portal@example.invalid",
      email_confirm: true,
    }));
    expect(admin.mappingInsert).toHaveBeenCalledWith({
      organization_id: organizationId,
      staff_profile_id: legacyProfileId,
      auth_user_id: authUserId,
      created_by: ownerProfileId,
    });
    expect(admin.client.from).not.toHaveBeenCalledWith("profiles");
    expect(admin.client.from.mock.calls.filter(([table]) => table === "org_memberships")).toHaveLength(1);
  });

  it("does not silently attach an Auth account when the login email already exists", async () => {
    const admin = adminClient({ code: "email_exists", message: "already registered" });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(admin.client as any);

    const response = await POST(request("existing@example.invalid"));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "STAFF_IDENTITY_ALREADY_EXISTS" });
    expect(admin.mappingInsert).not.toHaveBeenCalled();
  });
});
