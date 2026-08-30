import { NextResponse } from "next/server";
import { databaseUuidSchema } from "@/features/scheduling/schemas";
import { trialParticipantUpdateSchema } from "@/features/trials/contracts";
import { mapTrialRpcError } from "@/features/trials/server";
import { crmAdmin, requireCrmStaff } from "../../../_shared";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ participantId: string }> },
) {
  const access = await requireCrmStaff(
    new Set(["owner", "admin", "manager", "teacher"]),
  );
  if (!access.ok) return access.response;
  const { participantId } = await context.params;
  const parsed = trialParticipantUpdateSchema.safeParse(await request.json());
  if (!databaseUuidSchema.safeParse(participantId).success || !parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_TRIAL_PARTICIPANT",
        error: "Проверьте результат пробного занятия",
      },
      { status: 400 },
    );
  }
  const admin = crmAdmin();
  const { data, error } = await admin.rpc(
    "crm_record_trial_participant_result",
    {
      p_organization_id: access.organizationId,
      p_participant_id: participantId,
      p_actor_id: access.staffProfileId,
      p_status: parsed.data.status,
      p_result: parsed.data.result,
      p_result_comment: parsed.data.resultComment,
    },
  );
  if (error) {
    const mapped = mapTrialRpcError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
  return NextResponse.json({ ok: true, participant: data });
}
