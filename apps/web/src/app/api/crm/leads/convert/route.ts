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

    // 1. Fetch the lead
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

    if (lead.status === "converted") {
      return NextResponse.json(
        { ok: false, error: "Заявка уже переведена в статус ученика" },
        { status: 400 }
      );
    }

    // 2. Create the guardian (parent)
    const guardianData = {
      organization_id: lead.organization_id,
      full_name: lead.parent_name,
      phone: lead.parent_phone,
      email: lead.parent_email || null,
      notes: `Создан из заявки. Комментарий: ${lead.message || "нет"}`
    };

    const { data: guardian, error: guardianError } = await supabase
      .from("guardians")
      .insert(guardianData)
      .select("id")
      .single();

    if (guardianError || !guardian) {
      console.error("Create guardian error:", guardianError);
      return NextResponse.json(
        { ok: false, error: "Не удалось создать карточку родителя" },
        { status: 500 }
      );
    }

    // 3. Create the student
    const studentData = {
      organization_id: lead.organization_id,
      full_name: lead.child_name || `${lead.parent_name} (Ребенок)`,
      notes: `Создан автоматически из заявки. Возраст: ${lead.child_age || "не указан"}`,
      status: "active" as const
    };

    const { data: student, error: studentError } = await supabase
      .from("students")
      .insert(studentData)
      .select("id")
      .single();

    if (studentError || !student) {
      console.error("Create student error:", studentError);
      // Clean up guardian
      await supabase.from("guardians").delete().eq("id", guardian.id);
      return NextResponse.json(
        { ok: false, error: "Не удалось создать карточку ученика" },
        { status: 500 }
      );
    }

    // 4. Link student and guardian
    const { error: linkError } = await supabase
      .from("student_guardians")
      .insert({
        organization_id: lead.organization_id,
        student_id: student.id,
        guardian_id: guardian.id,
        is_primary: true,
        relation: "Родитель"
      });

    if (linkError) {
      console.error("Link guardian student error:", linkError);
      // Clean up both
      await supabase.from("students").delete().eq("id", student.id);
      await supabase.from("guardians").delete().eq("id", guardian.id);
      return NextResponse.json(
        { ok: false, error: "Не удалось связать ученика с родителем" },
        { status: 500 }
      );
    }

    // 5. Create Auth user for parent (for parent portal)
    // We construct a unique email if not provided
    const cleanPhone = lead.parent_phone.replace(/\D/g, "");
    const parentEmail = lead.parent_email || `parent-${cleanPhone || leadId.slice(0, 8)}@robotics-crm.ru`;
    
    console.log("Creating auth user for parent portal:", parentEmail);
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: parentEmail,
      password: "demo", // default password
      email_confirm: true
    });

    if (authError) {
      // If user already exists in auth.users, try to get existing ID
      if (authError.message && authError.message.includes("already registered")) {
        console.log("Auth user already exists. Linking existing auth user...");
        const { data: listUsers } = await supabase.auth.admin.listUsers();
        const existing = listUsers?.users.find(u => u.email === parentEmail);
        if (existing) {
          await supabase
            .from("guardians")
            .update({ user_id: existing.id })
            .eq("id", guardian.id);
        }
      } else {
        console.error("Auth user creation failed (non-blocking for conversion):", authError);
      }
    } else if (authUser?.user) {
      // Link user_id to guardian
      await supabase
        .from("guardians")
        .update({ user_id: authUser.user.id })
        .eq("id", guardian.id);
      console.log("Auth user linked to guardian.");
    }

    // 6. Enroll student in group if groupId provided
    let finalGroupId = groupId;
    if (!finalGroupId) {
      // Fallback: try to find a group that corresponds to the course
      const { data: groups } = await supabase
        .from("groups")
        .select("id")
        .eq("course_id", lead.course_id || "")
        .eq("status", "active")
        .limit(1);
      
      if (groups && groups.length > 0) {
        finalGroupId = groups[0].id;
      }
    }

    if (finalGroupId) {
      console.log("Enrolling student in group:", finalGroupId);
      await supabase
        .from("enrollments")
        .insert({
          organization_id: lead.organization_id,
          student_id: student.id,
          group_id: finalGroupId,
          status: "active",
          started_on: new Date().toISOString().split("T")[0]
        });
    }

    // 7. Update lead status
    const { error: updateLeadError } = await supabase
      .from("leads")
      .update({
        status: "converted",
        converted_student_id: student.id,
        converted_guardian_id: guardian.id
      })
      .eq("id", leadId);

    if (updateLeadError) {
      console.error("Update lead converted error:", updateLeadError);
    }

    return NextResponse.json({
      ok: true,
      studentId: student.id,
      guardianId: guardian.id,
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
