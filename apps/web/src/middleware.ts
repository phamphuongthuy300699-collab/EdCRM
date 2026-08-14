import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/shared/db/types";
import { isDemoAuthBypassAllowed } from "@/shared/utils/demo-auth";
import { assertSameOriginMutation } from "@/lib/security/origin";
import { resolveStaffProfileId } from "@/features/staff/browser-auth";
import { resolveProtectedPortalAccess } from "@/features/auth/portal-route-access";

const cookieMutationPrefixes = ["/api/crm/", "/api/parent/", "/api/teacher/", "/api/student/"];
const cookiePaymentMutations = new Set(["/api/payments/alfabank/create", "/api/payments/alfabank/status", "/api/payments/alfabank/return-status"]);
const sensitiveApiPrefixes = ["/api/crm/", "/api/parent/", "/api/teacher/", "/api/student/", "/api/debug/"];

function applySensitiveCachePolicy(response: NextResponse, pathname: string) {
  if (sensitiveApiPrefixes.some((prefix) => pathname.startsWith(prefix)) || cookiePaymentMutations.has(pathname)) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isCookieMutation = !["GET", "HEAD", "OPTIONS"].includes(request.method) && (
    cookieMutationPrefixes.some((prefix) => pathname.startsWith(prefix)) || cookiePaymentMutations.has(pathname)
  );
  if (isCookieMutation) {
    const origin = assertSameOriginMutation(request, process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin);
    if (!origin.ok) {
      console.warn("[security]", { scope: "security", event: "csrf_rejected", path: pathname });
      return applySensitiveCachePolicy(NextResponse.json({ ok: false, error: "Запрос отклонён", code: origin.code }, { status: origin.status }), pathname);
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Если ключей базы данных нет в окружении
  if (!url || !key) {
    const demoAuthBypassAllowed = isDemoAuthBypassAllowed();
    // Authorization bypass requires the explicit server-only flag and is impossible in Docker production.
    if (demoAuthBypassAllowed) return NextResponse.next();

    const protectedPagePrefixes = ["/crm", "/teacher", "/parent", "/student"];
    const isProtectedWithoutAuth = protectedPagePrefixes.some((prefix) => pathname.startsWith(prefix)) || (
      pathname.startsWith("/api/") && pathname !== "/api/health" && !pathname.startsWith("/api/public/")
    );
    const isPublicWithoutAuth = pathname === "/api/health" || pathname.startsWith("/api/public/") || !isProtectedWithoutAuth;
    if (isPublicWithoutAuth) return NextResponse.next();

    return new NextResponse("Authentication is not configured", { status: 503 });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check authentication for protected paths
  const isCrmPath = pathname.startsWith("/crm");
  const isTeacherPath = pathname === "/teacher" || pathname.startsWith("/teacher/");
  const isParentPath = pathname.startsWith("/parent");
  const isStudentPath = pathname.startsWith("/student");
  const isLoginPath = pathname === "/login";

  if (isCrmPath || isTeacherPath || isParentPath || isStudentPath || isLoginPath) {
    if (!user) {
      if (isLoginPath) {
        return response;
      }
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // User is authenticated, check their role
    try {
      const staffProfileId = await resolveStaffProfileId(supabase as any, user.id);
      // Query membership
      const { data: membership } = await (supabase.from("org_memberships") as any)
        .select("role")
        .eq("user_id", staffProfileId)
        .eq("is_active", true)
        .maybeSingle();

      // Query guardian
      const { data: guardianUser } = await (supabase.from("guardian_users") as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Query student
      const { data: studentUser } = await (supabase.from("student_users") as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const role = membership?.role; // 'owner' | 'admin' | 'manager' | 'teacher'
      const isGuardian = !!guardianUser;
      const isStudent = !!studentUser;

      // Handle login redirection
      if (isLoginPath) {
        if (role === "owner" || role === "admin" || role === "manager") {
          return NextResponse.redirect(new URL("/crm", request.url));
        } else if (role === "teacher") {
          return NextResponse.redirect(new URL("/teacher", request.url));
        } else if (isStudent) {
          return NextResponse.redirect(new URL("/student", request.url));
        } else if (isGuardian) {
          return NextResponse.redirect(new URL("/parent", request.url));
        } else {
          // Fallback
          return NextResponse.redirect(new URL("/crm", request.url));
        }
      }

      // Restrict CRM paths to owners, admins, and managers
      if (isCrmPath) {
        if (role === "owner" || role === "admin" || role === "manager") {
          return response;
        } else if (role === "teacher") {
          return NextResponse.redirect(new URL("/teacher", request.url));
        } else if (isStudent) {
          return NextResponse.redirect(new URL("/student", request.url));
        } else if (isGuardian) {
          return NextResponse.redirect(new URL("/parent", request.url));
        } else {
          // Unassigned role fallback
          return NextResponse.redirect(new URL("/login?error=role_check_failed", request.url));
        }
      }

      // Restrict Teacher paths
      if (isTeacherPath) {
        const decision = resolveProtectedPortalAccess({
          pathname,
          role: role || null,
          isGuardian,
          isStudent,
          hasTeacherPreview: request.nextUrl.searchParams.has("previewTeacherId"),
        });
        return decision.allow
          ? response
          : NextResponse.redirect(new URL(decision.redirectTo, request.url));
      }

      // Restrict Parent paths
      if (isParentPath) {
        if (isGuardian) {
          return response;
        } else if (role === "owner" || role === "admin" || role === "manager") {
          return NextResponse.redirect(new URL("/crm", request.url));
        } else if (role === "teacher") {
          return NextResponse.redirect(new URL("/teacher", request.url));
        } else if (isStudent) {
          return NextResponse.redirect(new URL("/student", request.url));
        } else {
          return NextResponse.redirect(new URL("/login?error=role_check_failed", request.url));
        }
      }

      // Restrict Student paths
      if (isStudentPath) {
        if (isStudent) {
          return response;
        } else if (role === "owner" || role === "admin" || role === "manager") {
          return NextResponse.redirect(new URL("/crm", request.url));
        } else if (role === "teacher") {
          return NextResponse.redirect(new URL("/teacher", request.url));
        } else if (isGuardian) {
          return NextResponse.redirect(new URL("/parent", request.url));
        } else {
          return NextResponse.redirect(new URL("/login?error=role_check_failed", request.url));
        }
      }
    } catch (err) {
      console.error("Middleware role check error:", err);
      if (isLoginPath) {
        return response;
      }
      return NextResponse.redirect(new URL("/login?error=role_check_failed", request.url));
    }
  }

  return applySensitiveCachePolicy(response, pathname);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/public (public api endpoints, like submitting a lead)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, icons, robots.txt, etc.
     */
    "/((?!api/public|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
