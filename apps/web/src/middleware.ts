import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/shared/db/types";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Если ключей базы данных нет в окружении, работаем в демонстрационном режиме без авторизации
  if (!url || !key) {
    return NextResponse.next();
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

  const pathname = request.nextUrl.pathname;

  // Check authentication for protected paths
  const isCrmPath = pathname.startsWith("/crm");
  const isTeacherPath = pathname.startsWith("/teacher");
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
      // Query membership
      const { data: membership } = await (supabase.from("org_memberships") as any)
        .select("role")
        .eq("user_id", user.id)
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
          return NextResponse.redirect(new URL("/login", request.url));
        }
      }

      // Restrict Teacher paths
      if (isTeacherPath) {
        if (role === "teacher") {
          return response;
        } else if (role === "owner" || role === "admin" || role === "manager") {
          return NextResponse.redirect(new URL("/crm", request.url));
        } else if (isStudent) {
          return NextResponse.redirect(new URL("/student", request.url));
        } else if (isGuardian) {
          return NextResponse.redirect(new URL("/parent", request.url));
        } else {
          return NextResponse.redirect(new URL("/login", request.url));
        }
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
          return NextResponse.redirect(new URL("/login", request.url));
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
          return NextResponse.redirect(new URL("/login", request.url));
        }
      }
    } catch (err) {
      console.error("Middleware role check error:", err);
      // Fallback: allow request if check failed to prevent lockouts
      return response;
    }
  }

  return response;
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

