import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import {
  linkedGuardianUsers,
  loadGuardian,
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
      return NextResponse.json({ ok: false, error: "Нельзя отключить доступ другой организации" }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const guardian = await loadGuardian(admin, parsed.data.organizationId, parsed.data.guardianId);
    const links = await linkedGuardianUsers(admin, parsed.data.organizationId, parsed.data.guardianId);

    const { error } = await (admin.from("guardian_users") as any)
      .delete()
      .eq("organization_id", parsed.data.organizationId)
      .eq("guardian_id", parsed.data.guardianId);
    if (error) throw error;

    await writeParentAccessAudit({
      organizationId: parsed.data.organizationId,
      actorId: access.userId,
      action: "parent_access_disabled",
      guardianId: parsed.data.guardianId,
      title: guardian.full_name,
      metadata: { removedLinks: links.map((link: any) => ({ id: link.id, userId: link.user_id })) },
    });

    return NextResponse.json({ ok: true, removedLinks: links.length });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Не удалось отключить доступ родителю" }, { status: 500 });
  }
}
