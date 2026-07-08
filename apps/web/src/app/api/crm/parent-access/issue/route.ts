import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import {
  assertGuardianStudentLink,
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
      return NextResponse.json({ ok: false, error: "Нельзя выдать доступ для другой организации" }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const guardian = await loadGuardian(admin, parsed.data.organizationId, parsed.data.guardianId);
    await assertGuardianStudentLink(admin, parsed.data.organizationId, parsed.data.guardianId, parsed.data.studentId);

    if (!guardian.email) {
      return NextResponse.json({ ok: false, error: "У родителя не указан email" }, { status: 422 });
    }

    const existingLinks = await linkedGuardianUsers(admin, parsed.data.organizationId, parsed.data.guardianId);
    const password = newTemporaryParentPassword();
    let authUser = await findAuthUserByEmail(admin, guardian.email);
    let createdAuthUser = false;

    if (!authUser) {
      const { data, error } = await admin.auth.admin.createUser({
        email: guardian.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: guardian.full_name, role: "guardian" },
      });
      if (error) throw error;
      authUser = data.user;
      createdAuthUser = true;
    }

    if (!authUser?.id) {
      throw new Error("Не удалось создать или найти Auth user родителя");
    }

    const { error: profileError } = await (admin.from("profiles") as any).upsert({
      id: authUser.id,
      full_name: guardian.full_name,
      phone: guardian.phone || null,
      email: guardian.email,
      updated_at: new Date().toISOString(),
    });
    if (profileError) throw profileError;

    const { error: linkError } = await (admin.from("guardian_users") as any).upsert(
      {
        organization_id: parsed.data.organizationId,
        guardian_id: parsed.data.guardianId,
        user_id: authUser.id,
      },
      { onConflict: "organization_id,guardian_id,user_id" },
    );
    if (linkError) throw linkError;

    await writeParentAccessAudit({
      organizationId: parsed.data.organizationId,
      actorId: access.userId,
      action: existingLinks.length > 0 ? "parent_access_relinked" : "parent_access_issued",
      guardianId: parsed.data.guardianId,
      title: guardian.full_name,
      metadata: { studentId: parsed.data.studentId || null, userId: authUser.id, createdAuthUser },
    });

    return NextResponse.json({
      ok: true,
      userId: authUser.id,
      email: guardian.email,
      createdAuthUser,
      temporaryPassword: createdAuthUser ? password : null,
      message: createdAuthUser
        ? "Доступ выдан. Временный пароль показан один раз."
        : "Auth user уже существовал. Пароль не менялся. При необходимости нажмите Сбросить пароль.",
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Не удалось выдать доступ родителю" }, { status: 500 });
  }
}
