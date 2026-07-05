import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { isDemoMode } from "@/shared/utils/demo";
import { requireStaffAdmin, temporaryPassword, userIdPayloadSchema } from "../_shared";

export async function POST(request: Request) {
  try {
    const parsed = userIdPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Некорректный userId" }, { status: 400 });
    }

    if (isDemoMode()) {
      return NextResponse.json({ ok: true, temporaryPassword: "demo" });
    }

    const access = await requireStaffAdmin();
    if (!access.ok) return access.response;

    const password = temporaryPassword();
    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.updateUserById(parsed.data.userId, {
      password,
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, temporaryPassword: password });
  } catch (error: any) {
    console.error("Staff reset password error:", error);
    return NextResponse.json({ ok: false, error: error.message || "Не удалось сбросить пароль" }, { status: 500 });
  }
}
