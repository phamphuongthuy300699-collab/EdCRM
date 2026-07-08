import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { isDemoMode } from "@/shared/utils/demo";
import { temporaryPortalPassword } from "@/shared/utils/passwords";

export const uuidSchema = z.string().uuid();

export const parentAccessPayloadSchema = z.object({
  organizationId: uuidSchema,
  guardianId: uuidSchema,
  studentId: uuidSchema.optional(),
});

export async function requireParentAccessStaff() {
  if (isDemoMode()) {
    return { ok: true as const, userId: "demo-user", organizationId: "demo-org", role: "admin" };
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

  const { data: membership } = await (supabase.from("org_memberships") as any)
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!membership || !["owner", "admin", "manager"].includes(membership.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Недостаточно прав" }, { status: 403 }),
    };
  }

  return { ok: true as const, userId: user.id, organizationId: membership.organization_id as string, role: membership.role as string };
}

export async function loadGuardian(admin: ReturnType<typeof createSupabaseAdminClient>, organizationId: string, guardianId: string) {
  const { data: guardian, error } = await (admin.from("guardians") as any)
    .select("id, organization_id, full_name, email, phone")
    .eq("id", guardianId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !guardian) {
    throw new Error("Родитель не найден в этой организации");
  }

  return guardian;
}

export async function assertGuardianStudentLink(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  organizationId: string,
  guardianId: string,
  studentId?: string,
) {
  if (!studentId) return;

  const { data: link, error } = await (admin.from("student_guardians") as any)
    .select("id")
    .eq("organization_id", organizationId)
    .eq("guardian_id", guardianId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (error || !link) {
    throw new Error("Родитель не привязан к указанному ученику");
  }
}

export async function findAuthUserByEmail(admin: ReturnType<typeof createSupabaseAdminClient>, email: string) {
  const { data: users } = await admin.auth.admin.listUsers();
  return users.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) || null;
}

export async function linkedGuardianUsers(admin: ReturnType<typeof createSupabaseAdminClient>, organizationId: string, guardianId: string) {
  const { data } = await (admin.from("guardian_users") as any)
    .select("id, user_id, profiles:user_id (id, email, full_name)")
    .eq("organization_id", organizationId)
    .eq("guardian_id", guardianId);

  return data || [];
}

export async function writeParentAccessAudit(input: {
  organizationId: string;
  actorId: string | null;
  action: string;
  guardianId: string;
  title?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  await (admin.from("crm_audit_log") as any).insert({
    organization_id: input.organizationId,
    actor_id: input.actorId,
    action: input.action,
    entity_table: "guardian_users",
    entity_id: input.guardianId,
    entity_title: input.title || null,
    metadata: input.metadata || {},
  });
}

export function newTemporaryParentPassword() {
  return temporaryPortalPassword("Roboks");
}

export function parentAccessStatus(guardian: any, links: any[], authUserExists: boolean) {
  if (links.length > 0) {
    return {
      status: authUserExists ? "linked" : "guardian_user_without_auth",
      label: authUserExists ? "Доступ выдан" : "guardian_users есть, auth user не найден",
    };
  }

  if (authUserExists) {
    return { status: "auth_without_guardian_user", label: "Auth user есть, доступ не привязан" };
  }

  if (!guardian.email) {
    return { status: "missing_email", label: "Доступ не выдан: у родителя нет email" };
  }

  return { status: "not_issued", label: "Доступ не выдан" };
}
