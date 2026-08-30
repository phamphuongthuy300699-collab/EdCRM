import { NextResponse } from "next/server";
import { databaseUuidSchema } from "@/features/scheduling/schemas";
import { trialEventChangeSchema } from "@/features/trials/contracts";
import { mapTrialRpcError } from "@/features/trials/server";
import { crmAdmin, crmMutationRoles, requireCrmStaff } from "../../_shared";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ trialId: string }> },
) {
  const access = await requireCrmStaff(crmMutationRoles);
  if (!access.ok) return access.response;
  const { trialId } = await context.params;
  const parsed = trialEventChangeSchema.safeParse(await request.json());
  if (!databaseUuidSchema.safeParse(trialId).success || !parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_TRIAL",
        error: "Проверьте параметры пробного занятия",
      },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const admin = crmAdmin();
  const { data, error } = await admin.rpc("crm_update_trial_event", {
    p_organization_id: access.organizationId,
    p_trial_event_id: trialId,
    p_actor_id: access.staffProfileId,
    p_action: input.action,
    p_teacher_id: input.action === "update" ? input.teacherId : null,
    p_branch_id: input.action === "update" ? input.branchId : null,
    p_room_id: input.action === "update" ? (input.roomId ?? null) : null,
    p_starts_at: input.action === "update" ? input.startsAt : null,
    p_ends_at: input.action === "update" ? input.endsAt : null,
    p_reason: input.action === "cancel" ? input.reason : null,
  });
  if (error) {
    const mapped = mapTrialRpcError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
  return NextResponse.json({ ok: true, result: data });
}
