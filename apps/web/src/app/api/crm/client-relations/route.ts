import { NextResponse } from "next/server";
import { z } from "zod";
import { crmAdmin, requireCrmStaff } from "../_shared";

const schema = z.object({ studentId:z.string().uuid(), guardianId:z.string().uuid(), relation:z.string().default("Родитель"), isPrimary:z.boolean().default(false), isBillingContact:z.boolean().default(false) }).strict();

export async function POST(request:Request){
  const access=await requireCrmStaff(new Set(["owner","admin","manager"])); if(!access.ok)return access.response;
  const input=schema.parse(await request.json()); const admin=crmAdmin();
  const {data,error}=await (admin.rpc("crm_link_student_guardian",{p_organization_id:access.organizationId,p_student_id:input.studentId,p_guardian_id:input.guardianId,p_relation:input.relation,p_is_primary:input.isPrimary,p_is_billing_contact:input.isBillingContact}) as any);
  if(error)return NextResponse.json({ok:false,error:error.message},{status:error.message.includes("already_exists")?409:400});
  return NextResponse.json({ok:true,result:data});
}
