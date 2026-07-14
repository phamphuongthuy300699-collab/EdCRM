import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../../_shared";

const mergeSchema = z.object({
  masterGuardianId: z.string().uuid(),
  duplicateGuardianId: z.string().uuid(),
});

export async function POST(request: Request) {
  const access = await requireCrmStaff();
  if (!access.ok) return access.response;

  const input = mergeSchema.parse(await request.json());
  if (input.masterGuardianId === input.duplicateGuardianId) {
    return NextResponse.json({ ok: false, error: "Нельзя объединить родителя с самим собой" }, { status: 400 });
  }

  const admin = crmAdmin();
  const { data: guardians, error: guardiansError } = await (admin.from("guardians") as any)
    .select("id, organization_id")
    .eq("organization_id", access.organizationId)
    .in("id", [input.masterGuardianId, input.duplicateGuardianId]);

  if (guardiansError) {
    return NextResponse.json({ ok: false, error: guardiansError.message }, { status: 500 });
  }
  if ((guardians || []).length !== 2) {
    return NextResponse.json({ ok: false, error: "Родители не найдены в вашей организации" }, { status: 404 });
  }

  const { data, error } = await (admin.rpc("crm_merge_guardians", {
    p_organization_id: access.organizationId,
    p_master_guardian_id: input.masterGuardianId,
    p_duplicate_guardian_id: input.duplicateGuardianId,
    p_actor_id: access.userId === "demo-user" ? null : access.userId,
  }) as any);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: data });
}
