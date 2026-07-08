import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import {
  findAuthUserByEmail,
  linkedGuardianUsers,
  loadGuardian,
  newTemporaryParentPassword,
  parentAccessPayloadSchema,
  requireParentAccessStaff,
  writeParentAccessAudit,
} from "../_shared";

export async function POST(request: Request) {
  try {
    const parsed = parentAccessPayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Некорректные данные родителя" }, { status: 400 });
    }

    const access = await requireParentAccessStaff();
    if (!access.ok) return access.response;
    if (parsed.data.organizationId !== access.organizationId && access.organizationId !== "demo-org") {
      return NextResponse.json({ ok: false, error: "Нельзя сбросить доступ другой организации" }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const guardian = await loadGuardian(admin, parsed.data.organizationId, parsed.data.guardianId);
    const links = await linkedGuardianUsers(admin, parsed.data.organizationId, parsed.data.guardianId);
    const userId = links[0]?.user_id || (guardian.email ? (await findAuthUserByEmail(admin, guardian.email))?.id : null);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Auth user родителя не найден" }, { status: 404 });
    }

    const password = newTemporaryParentPassword();
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) throw error;

    await writeParentAccessAudit({
      organizationId: parsed.data.organizationId,
      actorId: access.userId,
      action: "parent_access_password_reset",
      guardianId: parsed.data.guardianId,
      title: guardian.full_name,
      metadata: { userId },
    });

    return NextResponse.json({ ok: true, userId, temporaryPassword: password });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Не удалось сбросить пароль родителю" }, { status: 500 });
  }
}
