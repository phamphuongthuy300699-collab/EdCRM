import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createPublicLeadSchema } from "@/features/leads/schemas";
import type { Database } from "@/shared/db/types";

const DEFAULT_ORG_SLUG = process.env.DEFAULT_ORG_SLUG || "robotics-lipetsk";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createPublicLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Некорректные данные формы", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", DEFAULT_ORG_SLUG)
      .single();

    if (orgError || !org) {
      console.error("Organization fetch error:", orgError);
      return NextResponse.json(
        { ok: false, error: "Организация не найдена" },
        { status: 500 }
      );
    }

    const input = parsed.data;

    const leadData: Database["public"]["Tables"]["leads"]["Insert"] = {
      organization_id: org.id,
      status: "new",
      source: "site_form",
      parent_name: input.parentName,
      parent_phone: input.parentPhone,
      parent_email: input.parentEmail || null,
      child_name: input.childName || null,
      child_age: input.childAge || null,
      course_id: input.courseId || null,
      message: input.message || null,
    };

    const { error } = await supabase.from("leads").insert(leadData);

    if (error) {
      console.error("Lead insert error:", error);
      return NextResponse.json(
        { ok: false, error: "Не удалось сохранить заявку" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Public lead API error:", err);
    return NextResponse.json(
      { ok: false, error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
