import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";

const DEFAULT_ORG_SLUG = process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG || "robotics-lipetsk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DbDiagnostics = {
  connected: boolean;
  orgFound: boolean;
  orgName: string | null;
  branchesCount: number;
  coursesCount: number;
  publicCoursesCount: number;
  tariffsCount: number;
  groupsCount: number;
  teachersCount: number;
  error: string | null;
};

async function countRows(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  table: string,
  applyFilters: (query: any) => any,
) {
  const query = applyFilters(
    supabase
      .from(table)
      .select("id", { count: "exact", head: true }),
  );
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function GET() {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Необходима авторизация" }, { status: 401 });
  }

  const { data: membership } = await (authClient.from("org_memberships") as any)
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ ok: false, error: "Недостаточно прав" }, { status: 403 });
  }

  const env = {
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasPublishableKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    hasSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
    defaultOrgSlug: process.env.NEXT_PUBLIC_DEFAULT_ORG_SLUG || null,
    demoMode: process.env.NEXT_PUBLIC_DEMO_MODE || null,
    mediaDriver: process.env.MEDIA_DRIVER || process.env.NEXT_PUBLIC_MEDIA_DRIVER || null,
    mediaBucket: process.env.NEXT_PUBLIC_MEDIA_BUCKET || null,
  };

  const db: DbDiagnostics = {
    connected: false,
    orgFound: false,
    orgName: null,
    branchesCount: 0,
    coursesCount: 0,
    publicCoursesCount: 0,
    tariffsCount: 0,
    groupsCount: 0,
    teachersCount: 0,
    error: null,
  };

  try {
    const supabase = createSupabaseAdminClient();
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("slug", DEFAULT_ORG_SLUG)
      .maybeSingle();

    if (orgError) throw orgError;

    db.connected = true;
    db.orgFound = Boolean(org);
    db.orgName = org?.name || null;

    if (org?.id) {
      const orgFilter = (query: any) => query.eq("organization_id", org.id);
      db.branchesCount = await countRows(supabase, "branches", orgFilter);
      db.coursesCount = await countRows(supabase, "courses", orgFilter);
      db.publicCoursesCount = await countRows(
        supabase,
        "courses",
        (query) => orgFilter(query).eq("is_public", true).eq("is_active", true),
      );
      db.tariffsCount = await countRows(
        supabase,
        "course_tariffs",
        (query) => orgFilter(query).eq("show_on_site", true),
      );
      db.groupsCount = await countRows(
        supabase,
        "groups",
        (query) => orgFilter(query).eq("show_on_site", true).eq("status", "active"),
      );
      db.teachersCount = await countRows(
        supabase,
        "org_memberships",
        (query) => orgFilter(query).eq("role", "teacher").eq("is_active", true),
      );
    }
  } catch (error) {
    db.error = error instanceof Error ? error.message : "Unknown database error";
  }

  return NextResponse.json({ env, db });
}
