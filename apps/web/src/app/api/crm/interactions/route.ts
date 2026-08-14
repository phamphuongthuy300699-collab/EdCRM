import { NextResponse } from "next/server";
import { z } from "zod";
import { interactionSchema } from "@/features/clients/contracts";
import { crmAdmin, requireCrmStaff } from "../_shared";

const crmRoles = new Set(["owner", "admin", "manager"]);
const completeSchema = z.object({ interactionId: z.string().uuid() }).strict();

export async function GET(request: Request) {
  const access = await requireCrmStaff(crmRoles);
  if (!access.ok) return access.response;

  const url = new URL(request.url);
  const admin = crmAdmin();
  let query = (admin.from("lead_interactions") as any)
    .select("id,lead_id,guardian_id,student_id,manager_id,type,result,summary,next_action_at,next_action_completed_at,created_at")
    .eq("organization_id", access.organizationId)
    .order("created_at", { ascending: false });

  const guardianId = url.searchParams.get("guardianId");
  const studentId = url.searchParams.get("studentId");
  const leadId = url.searchParams.get("leadId");
  if (guardianId) query = query.eq("guardian_id", guardianId);
  if (studentId) query = query.eq("student_id", studentId);
  if (leadId) query = query.eq("lead_id", leadId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, interactions: data || [] });
}

export async function POST(request: Request) {
  const access = await requireCrmStaff(crmRoles);
  if (!access.ok) return access.response;

  const input = interactionSchema.parse(await request.json());
  const admin = crmAdmin();
  const { data, error } = await (admin.rpc("crm_record_interaction", {
    p_organization_id: access.organizationId,
    p_guardian_id: input.guardianId || null,
    p_student_id: input.studentId || null,
    p_lead_id: input.leadId || null,
    p_actor_id: access.staffProfileId === "demo-staff" ? null : access.staffProfileId,
    p_type: input.type,
    p_result: input.result || null,
    p_summary: input.summary || null,
    p_next_action_at: input.nextActionAt || null,
    p_complete_interaction_id: input.completeInteractionId || null,
  }) as any);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, result: data });
}

export async function PATCH(request: Request) {
  const access = await requireCrmStaff(crmRoles);
  if (!access.ok) return access.response;

  const input = completeSchema.parse(await request.json());
  const admin = crmAdmin();
  const { data, error } = await (admin.rpc("crm_complete_followup", {
    p_organization_id: access.organizationId,
    p_interaction_id: input.interactionId,
    p_actor_id: access.staffProfileId === "demo-staff" ? null : access.staffProfileId,
  }) as any);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, result: data, next_action_completed_at: data?.completed_at });
}
