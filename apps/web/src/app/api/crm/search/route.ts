import { NextResponse } from "next/server";
import { crmAdmin, requireCrmStaff } from "../_shared";

function like(query: string) {
  return `%${query.replace(/[%_]/g, "")}%`;
}

export async function GET(request: Request) {
  const access = await requireCrmStaff(new Set(["owner", "admin", "manager", "accountant", "teacher"]));
  if (!access.ok) return access.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ ok: true, results: { students: [], guardians: [], invoices: [], groups: [] } });

  const admin = crmAdmin();
  const pattern = like(q);
  const org = access.organizationId;

  const [students, guardians, invoices, groups] = await Promise.all([
    (admin.from("students") as any)
      .select("id, full_name, status, student_guardians (guardians (full_name, phone, email)), enrollments (groups (title))")
      .eq("organization_id", org)
      .is("deleted_at", null)
      .or(`full_name.ilike.${pattern},notes.ilike.${pattern}`)
      .limit(8),
    (admin.from("guardians") as any)
      .select("id, full_name, phone, email, status")
      .eq("organization_id", org)
      .is("deleted_at", null)
      .or(`full_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern},phone_normalized.ilike.${pattern},email_normalized.ilike.${pattern}`)
      .limit(8),
    (admin.from("invoices") as any)
      .select("id, title, number, status, amount, students (full_name), guardians (full_name)")
      .eq("organization_id", org)
      .or(`title.ilike.${pattern},number.ilike.${pattern}`)
      .limit(8),
    (admin.from("groups") as any)
      .select("id, title, status")
      .eq("organization_id", org)
      .is("deleted_at", null)
      .ilike("title", pattern)
      .limit(8),
  ]);

  for (const result of [students, guardians, invoices, groups]) {
    if (result.error) return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    results: {
      students: (students.data || []).map((item: any) => ({ type: "student", id: item.id, title: item.full_name, subtitle: item.status, href: `/crm/students?student=${item.id}` })),
      guardians: (guardians.data || []).map((item: any) => ({ type: "guardian", id: item.id, title: item.full_name, subtitle: [item.phone, item.email].filter(Boolean).join(" · "), href: `/crm/guardians?guardian=${item.id}` })),
      invoices: (invoices.data || []).map((item: any) => ({ type: "invoice", id: item.id, title: item.title || item.number, subtitle: `${item.status} · ${Number(item.amount || 0).toLocaleString("ru-RU")} ₽`, href: `/crm/invoices?invoice=${item.id}` })),
      groups: (groups.data || []).map((item: any) => ({ type: "group", id: item.id, title: item.title, subtitle: item.status, href: `/crm/groups?group=${item.id}` })),
    },
  });
}
