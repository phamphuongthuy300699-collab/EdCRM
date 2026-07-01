import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { isDemoMode } from "@/shared/utils/demo";

export async function requirePaymentAdmin() {
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
