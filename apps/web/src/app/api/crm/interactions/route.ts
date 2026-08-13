import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../_shared";
import { interactionSchema } from "@/features/clients/contracts";

const completeSchema=z.object({interactionId:z.string().uuid()}).strict();
export async function GET(request:Request){
 const access=await requireCrmStaff(new Set(["owner","admin","manager"]));if(!access.ok)return access.response;
 const url=new URL(request.url);const admin=crmAdmin();let query=(admin.from("lead_interactions") as any).select("id,lead_id,guardian_id,student_id,manager_id,type,result,summary,next_action_at,next_action_completed_at,created_at").eq("organization_id",access.organizationId).order("created_at",{ascending:false});
 const guardianId=url.searchParams.get("guardianId"),studentId=url.searchParams.get("studentId"),leadId=url.searchParams.get("leadId");
 if(guardianId)query=query.eq("guardian_id",guardianId);if(studentId)query=query.eq("student_id",studentId);if(leadId)query=query.eq("lead_id",leadId);
 const {data,error}=await query;if(error)return NextResponse.json({ok:false,error:error.message},{status:500});return NextResponse.json({ok:true,interactions:data||[]});
}
export async function POST(request:Request){
 const access=await requireCrmStaff(new Set(["owner","admin","manager"]));if(!access.ok)return access.response;const input=interactionSchema.parse(await request.json());const admin=crmAdmin();
 const {data,error}=await (admin.from("lead_interactions") as any).insert({organization_id:access.organizationId,lead_id:input.leadId||null,guardian_id:input.guardianId||null,student_id:input.studentId||null,manager_id:access.userId==="demo-user"?null:access.userId,type:input.type,result:input.result||null,summary:input.summary||null,next_action_at:input.nextActionAt||null}).select().single();
 if(error)return NextResponse.json({ok:false,error:error.message},{status:400});return NextResponse.json({ok:true,interaction:data});
}
export async function PATCH(request:Request){
 const access=await requireCrmStaff(new Set(["owner","admin","manager"]));if(!access.ok)return access.response;const input=completeSchema.parse(await request.json());const admin=crmAdmin();
 const {data,error}=await (admin.rpc("crm_complete_followup",{p_organization_id:access.organizationId,p_interaction_id:input.interactionId,p_actor_id:access.userId==="demo-user"?null:access.userId}) as any);
 if(error)return NextResponse.json({ok:false,error:error.message},{status:400});return NextResponse.json({ok:true,result:data,next_action_completed_at:data?.completed_at});
}
