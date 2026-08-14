import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { isDemoAuthBypassAllowed } from "@/shared/utils/demo-auth";
import { temporaryPortalPassword } from "@/shared/utils/passwords";
import { loadStaffAuthContext } from "@/features/staff/auth-context";

export const staffRoleSchema = z.enum(["owner", "admin", "manager", "teacher", "accountant"]);
export const postgresUuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID",
);
const optionalOrganizationIdSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  postgresUuidSchema.optional(),
);
const optionalUserIdSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  postgresUuidSchema.optional(),
);

export const staffPayloadSchema = z.object({
  organizationId: optionalOrganizationIdSchema,
  userId: optionalUserIdSchema,
  email: z.string().email(),
  fullName: z.string().min(2).max(160),
  phone: z.string().max(40).optional().nullable(),
  role: staffRoleSchema,
  specialty: z.string().max(160).optional().nullable(),
  publicBio: z.string().max(1200).optional().nullable(),
  internalComment: z.string().max(1200).optional().nullable(),
  avatarUrl: z.string().optional().nullable().or(z.literal("")),
  showOnSite: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
}).strict();

export const userIdPayloadSchema = z.object({
  userId: postgresUuidSchema,
  organizationId: postgresUuidSchema.optional(),
}).strict();

export const staffProfileIdPayloadSchema = z.object({
  staffProfileId: postgresUuidSchema,
  organizationId: postgresUuidSchema.optional(),
}).strict();

export const provisionStaffAccessSchema = staffProfileIdPayloadSchema.extend({
  loginEmail: z.string().trim().email(),
}).strict();

export async function requireStaffAdmin() {
  if (isDemoAuthBypassAllowed()) {
    return { ok: true as const, authUserId: "demo-auth", staffProfileId: "demo-staff", organizationId: "demo-org", role: "admin" };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Необходима авторизация" }, { status: 401 }),
    };
  }

  const context = await loadStaffAuthContext(createSupabaseAdminClient(), user.id);

  if (!context || !["owner", "admin"].includes(context.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Недостаточно прав" }, { status: 403 }),
    };
  }

  return { ok: true as const, ...context };
}

export async function resolveOrganizationId(preferred?: string) {
  if (preferred) return preferred;

  const admin = createSupabaseAdminClient();
  const { data: org, error } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", process.env.DEFAULT_ORG_SLUG || "robotics-lipetsk")
    .single();

  if (error || !org) {
    throw new Error("Организация не найдена");
  }

  return org.id;
}

export function temporaryPassword() {
  return temporaryPortalPassword("Roboks");
}

const staffOrganizationMetadataKey = "edcrm_staff_organization_id";

export function staffIdentityMetadata(organizationId: string) {
  return { [staffOrganizationMetadataKey]: organizationId };
}

export function isStaffIdentityOwnedByOrganization(
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined,
  organizationId: string,
) {
  return user?.app_metadata?.[staffOrganizationMetadataKey] === organizationId;
}

type IdentityOrganizationLink = { organization_id: string | null };

export function identityOrganizationsAreExclusive(
  linkSets: IdentityOrganizationLink[][],
  organizationId: string,
) {
  const organizations = new Set(
    linkSets.flatMap((links) => links.map((link) => link.organization_id).filter((id): id is string => Boolean(id))),
  );
  return organizations.size === 1 && organizations.has(organizationId);
}

export async function hasExclusiveStaffIdentityScope(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  organizationId: string,
) {
  const results = await Promise.all([
    (admin.from("org_memberships") as any).select("organization_id").eq("user_id", userId),
    (admin.from("guardian_users") as any).select("organization_id").eq("user_id", userId),
    (admin.from("student_users") as any).select("organization_id").eq("user_id", userId),
    (admin.from("staff_auth_identities") as any).select("organization_id").eq("auth_user_id", userId),
  ]);
  if (results.some((result) => result.error)) return false;
  return identityOrganizationsAreExclusive(
    results.map((result) => (result.data || []) as IdentityOrganizationLink[]),
    organizationId,
  );
}
