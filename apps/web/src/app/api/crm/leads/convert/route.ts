import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { temporaryPortalPassword } from "@/shared/utils/passwords";

export async function POST(request: Request) {
  try {
    const { leadId, groupId } = await request.json();

    if (!leadId) {
      return NextResponse.json(
        { ok: false, error: "Не передан leadId" },
        { status: 400 }
      );
    }

    const authClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Необходима авторизация" },
        { status: 401 }
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

    const { data: membership } = await (authClient.from("org_memberships") as any)
      .select("role")
      .eq("organization_id", lead.organization_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership || !["owner", "admin", "manager"].includes(membership.role)) {
      return NextResponse.json(
        { ok: false, error: "Недостаточно прав" },
        { status: 403 }
      );
    }

    if (groupId) {
      const { data: group, error: groupError } = await (supabase.from("groups") as any)
        .select("id, organization_id, capacity, status")
        .eq("id", groupId)
        .maybeSingle();

      if (groupError || !group || group.organization_id !== lead.organization_id || group.status !== "active") {
        return NextResponse.json(
          { ok: false, error: "Группа не найдена или недоступна для зачисления" },
          { status: 404 }
        );
      }

      const { count: activeEnrollmentCount, error: enrollmentCountError } = await (supabase.from("enrollments") as any)
        .select("id", { count: "exact", head: true })
        .eq("group_id", groupId)
        .in("status", ["active", "paused"]);

      if (enrollmentCountError) {
        console.error("Enrollment capacity check error:", enrollmentCountError.message);
        return NextResponse.json(
          { ok: false, error: "Не удалось проверить вместимость группы" },
          { status: 500 }
        );
      }

      const capacity = Number(group.capacity || 0);
      if (capacity > 0 && Number(activeEnrollmentCount || 0) >= capacity) {
        return NextResponse.json(
          { ok: false, error: "В группе нет свободных мест" },
          { status: 409 }
        );
      }
    }

    // 2. Call the transactional RPC to convert the lead safely
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "convert_lead_to_student",
      { p_lead_id: leadId, p_group_id: groupId || null }
    );

    if (rpcError || !rpcResult) {
      if (rpcError?.message?.includes("group_capacity_exceeded")) {
        return NextResponse.json(
          { ok: false, error: "В группе нет свободных мест" },
          { status: 409 }
        );
      }

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
    const parentTemporaryPassword = temporaryPortalPassword();

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: parentEmail,
      password: parentTemporaryPassword,
      email_confirm: true
    });

    let parentUserId: string | null = null;
    let createdParentUser = false;

    if (authError) {
      if (authError.message && authError.message.includes("already registered")) {
        const { data: listUsers } = await supabase.auth.admin.listUsers();
        const existing = listUsers?.users.find(u => u.email === parentEmail);
        if (existing) {
          parentUserId = existing.id;
        }
      } else {
        console.error("Auth user creation failed during lead conversion:", authError.message);
      }
    } else if (authUser?.user) {
      parentUserId = authUser.user.id;
      createdParentUser = true;
    }

    // 5. Link parent user to guardian in guardian_users
    if (parentUserId) {
      await supabase
        .from("guardian_users")
        .upsert({
          organization_id: lead.organization_id,
          guardian_id: guardianId,
          user_id: parentUserId
        }, { onConflict: "organization_id,guardian_id,user_id" });
    }

    return NextResponse.json({
      ok: true,
      studentId,
      guardianId,
      alreadyConverted: false,
      parentEmail,
      parentTemporaryPassword: createdParentUser ? parentTemporaryPassword : null
    });
  } catch (err: any) {
    console.error("Lead conversion API error:", err);
    return NextResponse.json(
      { ok: false, error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
