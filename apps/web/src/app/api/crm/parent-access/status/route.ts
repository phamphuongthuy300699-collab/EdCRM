import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import {
  findAuthUserByEmail,
  linkedGuardianUsers,
  loadGuardian,
  parentAccessPayloadSchema,
  parentAccessStatus,
  requireParentAccessStaff,
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
      return NextResponse.json({ ok: false, error: "Нельзя смотреть доступ другой организации" }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const guardian = await loadGuardian(admin, parsed.data.organizationId, parsed.data.guardianId);
    const links = await linkedGuardianUsers(admin, parsed.data.organizationId, parsed.data.guardianId);
    const authUser = guardian.email ? await findAuthUserByEmail(admin, guardian.email) : null;
    const status = parentAccessStatus(guardian, links, Boolean(authUser));

    return NextResponse.json({
      ok: true,
      guardian: { id: guardian.id, fullName: guardian.full_name, email: guardian.email, phone: guardian.phone },
      status,
      linkedUsers: links.map((link: any) => ({ id: link.id, userId: link.user_id, email: link.profiles?.email || null })),
      authUserId: authUser?.id || null,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Не удалось получить статус доступа" }, { status: 500 });
  }
}
