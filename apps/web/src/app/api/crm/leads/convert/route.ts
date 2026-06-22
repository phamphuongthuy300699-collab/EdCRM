import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";

export async function POST(request: Request) {
  try {
    const { leadId, groupId } = await request.json();

    if (!leadId) {
      return NextResponse.json(
        { ok: false, error: "Не передан leadId" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // 1. Fetch the lead to get parent info for Auth User provisioning
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      console.error("Fetch lead error:", leadError);
      return NextResponse.json(
        { ok: false, error: "Заявка не найдена" },
        { status: 404 }
      );
    }

    // 2. Call the transactional RPC to convert the lead safely
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "convert_lead_to_student",
      { p_lead_id: leadId, p_group_id: groupId || null }
    );

    if (rpcError || !rpcResult) {
      console.error("RPC convert_lead_to_student error:", rpcError);
      return NextResponse.json(
        { ok: false, error: rpcError?.message || "Не удалось конвертировать лида" },
        { status: 500 }
      );
    }

    const result = rpcResult as any;
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: "Не удалось выполнить конвертацию лида" },
        { status: 500 }
      );
    }

    const { studentId, guardianId, alreadyConverted } = result;

    // 3. If already converted, return immediately
    if (alreadyConverted) {
      return NextResponse.json({
        ok: true,
        studentId,
        guardianId,
        alreadyConverted: true
      });
    }

    // 4. Create Auth user for parent (for parent portal) if not already created
    const cleanPhone = lead.parent_phone.replace(/\D/g, "");
    const parentEmail = lead.parent_email || `parent-${cleanPhone || leadId.slice(0, 8)}@robotics-crm.ru`;
    
    console.log("Creating auth user for parent portal:", parentEmail);
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: parentEmail,
      password: "demo", // default password
      email_confirm: true
    });

    let parentUserId: string | null = null;

    if (authError) {
      if (authError.message && authError.message.includes("already registered")) {
        console.log("Auth user already registered. Linking existing auth user...");
        const { data: listUsers } = await supabase.auth.admin.listUsers();
        const existing = listUsers?.users.find(u => u.email === parentEmail);
        if (existing) {
          parentUserId = existing.id;
        }
      } else {
        console.error("Auth user creation failed (non-blocking for conversion):", authError);
      }
    } else if (authUser?.user) {
      parentUserId = authUser.user.id;
    }

    // 5. Link parent user to guardian in guardian_users
    if (parentUserId) {
      await supabase
        .from("guardian_users")
        .insert({
          organization_id: lead.organization_id,
          guardian_id: guardianId,
          user_id: parentUserId
        });
      console.log("Linked auth user to guardian in guardian_users.");
    }

    return NextResponse.json({
      ok: true,
      studentId,
      guardianId,
      alreadyConverted: false,
      parentEmail
    });
  } catch (err: any) {
    console.error("Lead conversion API error:", err);
    return NextResponse.json(
      { ok: false, error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
