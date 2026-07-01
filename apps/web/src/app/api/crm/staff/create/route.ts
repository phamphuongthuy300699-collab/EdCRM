import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoMode } from "@/shared/utils/demo";
import { requireStaffAdmin, resolveOrganizationId, staffPayloadSchema, temporaryPassword } from "../_shared";

export async function POST(request: Request) {
  try {
    const parsed = staffPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Некорректные данные сотрудника", details: parsed.error.format() }, { status: 400 });
    }

    if (isDemoMode()) {
      return NextResponse.json({
        ok: true,
        userId: `demo-${Date.now()}`,
        temporaryPassword: "demo",
      });
    }

    const access = await requireStaffAdmin();
    if (!access.ok) return access.response;

    const input = parsed.data;
    const organizationId = await resolveOrganizationId(input.organizationId || access.organizationId);
    const password = temporaryPassword();
    const admin = createSupabaseAdminClient();

    const { data: authUser, error: createError } = await admin.auth.admin.createUser({
      email: input.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
      },
    });

    let userId = authUser.user?.id || null;
    if (createError) {
      if (!createError.message.includes("already registered")) {
        throw createError;
      }
      const { data: users } = await admin.auth.admin.listUsers();
      userId = users.users.find((user) => user.email?.toLowerCase() === input.email.toLowerCase())?.id || null;
    }

    if (!userId) throw new Error("Не удалось создать или найти Auth user");

    const { error: profileError } = await (admin.from("profiles") as any).upsert({
      id: userId,
      full_name: input.fullName,
      phone: input.phone || null,
      email: input.email,
      avatar_url: input.avatarUrl || null,
      specialty: input.specialty || null,
      public_bio: input.publicBio || null,
      internal_comment: input.internalComment || null,
      show_on_site: input.showOnSite ?? false,
      sort_order: input.sortOrder ?? 100,
      updated_at: new Date().toISOString(),
    });
    if (profileError) throw profileError;

    const { error: membershipError } = await (admin.from("org_memberships") as any).upsert(
      {
        organization_id: organizationId,
        user_id: userId,
        role: input.role,
        is_active: true,
      },
      { onConflict: "organization_id,user_id" },
    );
    if (membershipError) throw membershipError;

    return NextResponse.json({ ok: true, userId, temporaryPassword: password });
  } catch (error: any) {
    console.error("Staff create error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Не удалось создать сотрудника" }, { status: 500 });
  }
}
