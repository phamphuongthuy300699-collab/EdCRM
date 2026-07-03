import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { requireStaffAdmin, resolveOrganizationId } from "../_shared";

export async function GET(request: Request) {
  try {
    const access = await requireStaffAdmin();
    if (!access.ok) return access.response;

    const organizationId = await resolveOrganizationId(access.organizationId);
    const admin = createSupabaseAdminClient();

    // Query memberships joined with profiles
    const { data: memberships, error } = await admin
      .from("org_memberships")
      .select(`
        user_id,
        role,
        is_active,
        profiles (
          id,
          full_name,
          phone,
          email,
          avatar_url,
          specialty,
          public_bio,
          internal_comment,
          show_on_site,
          show_public_contacts,
          sort_order
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const staff = (memberships || []).map((membership: any) => {
      const profile = Array.isArray(membership.profiles) 
        ? membership.profiles[0] 
        : membership.profiles;

      return {
        user_id: membership.user_id,
        role: membership.role,
        is_active: membership.is_active,
        full_name: profile?.full_name || "",
        email: profile?.email || "",
        phone: profile?.phone || "",
        avatar_url: profile?.avatar_url || "",
        specialty: profile?.specialty || "",
        public_bio: profile?.public_bio || "",
        internal_comment: profile?.internal_comment || "",
        show_on_site: profile?.show_on_site ?? false,
        show_public_contacts: profile?.show_public_contacts ?? false,
        sort_order: profile?.sort_order ?? 100,
      };
    });

    return NextResponse.json({ ok: true, staff });
  } catch (error: any) {
    console.error("Staff list error:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Не удалось загрузить список сотрудников" },
      { status: 500 }
    );
  }
}
