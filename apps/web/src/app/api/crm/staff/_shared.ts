import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { isDemoMode } from "@/shared/utils/demo";

export const staffRoleSchema = z.enum(["owner", "admin", "manager", "teacher", "accountant"]);

export const staffPayloadSchema = z.object({
  organizationId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  email: z.string().email(),
  fullName: z.string().min(2).max(160),
  phone: z.string().max(40).optional().nullable(),
  role: staffRoleSchema,
  specialty: z.string().max(160).optional().nullable(),
  publicBio: z.string().max(1200).optional().nullable(),
  internalComment: z.string().max(1200).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable().or(z.literal("")),
  showOnSite: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const userIdPayloadSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
});

export async function requireStaffAdmin() {
  if (isDemoMode()) {
    return { ok: true as const, organizationId: "demo-org" };
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

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Недостаточно прав" }, { status: 403 }),
    };
  }

  return { ok: true as const, organizationId: membership.organization_id as string };
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
  const suffix = Math.random().toString(36).slice(2, 8);
  return `Robotics-${suffix}-2026`;
}
