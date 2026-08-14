import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoAuthBypassAllowed } from "@/shared/utils/demo-auth";
import { loadStaffAuthContext } from "@/features/staff/auth-context";

export async function requirePaymentAdmin() {
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
