import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { isDemoMode } from "@/shared/utils/demo";

export const crmMutationRoles = new Set(["owner", "admin", "manager"]);
export const crmFinanceRoles = new Set(["owner", "admin", "manager", "accountant"]);

export async function requireCrmStaff(roles: Set<string> = crmMutationRoles) {
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

  if (!membership?.organization_id || !roles.has(membership.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Недостаточно прав" }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    userId: user.id,
    organizationId: membership.organization_id as string,
    role: membership.role as string,
  };
}

export function crmAdmin() {
  return createSupabaseAdminClient();
}
