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
  const canSeeFinance = ["owner", "admin", "manager", "accountant"].includes(access.role);
  const canSeeGuardians = ["owner", "admin", "manager", "accountant"].includes(access.role);

  const [students, guardians, invoices, groups] = await Promise.all([
    (admin.from("students") as any)
      .select("id, full_name, status, student_guardians (guardians (full_name, phone, email)), enrollments (groups (title))")
      .eq("organization_id", org)
      .is("deleted_at", null)
      .limit(50),
    canSeeGuardians ? (admin.from("guardians") as any)
      .select("id, full_name, phone, email, status, student_guardians (students (full_name))")
      .eq("organization_id", org)
      .is("deleted_at", null)
      .limit(50) : Promise.resolve({ data: [], error: null }),
    canSeeFinance ? (admin.from("invoices") as any)
      .select("id, title, number, status, amount, students (full_name), guardians (full_name, phone, email)")
      .eq("organization_id", org)
      .limit(50) : Promise.resolve({ data: [], error: null }),
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

  const lower = q.toLowerCase();
  const includes = (value: unknown) => String(value || "").toLowerCase().includes(lower);
  const studentRows = (students.data || []).filter((item: any) => {
    const guardianText = (item.student_guardians || []).map((link: any) => {
      if (access.role === "teacher") return link.guardians?.full_name || "";
      return `${link.guardians?.full_name || ""} ${link.guardians?.phone || ""} ${link.guardians?.email || ""}`;
    }).join(" ");
    const groupText = (item.enrollments || []).map((enrollment: any) => enrollment.groups?.title || "").join(" ");
    return includes(`${item.full_name} ${guardianText} ${groupText}`);
  }).slice(0, 8);
  const guardianRows = (guardians.data || []).filter((item: any) => {
    const childText = (item.student_guardians || []).map((link: any) => link.students?.full_name || "").join(" ");
    return includes(`${item.full_name} ${item.phone || ""} ${item.email || ""} ${childText}`);
  }).slice(0, 8);
  const invoiceRows = (invoices.data || []).filter((item: any) => includes(`${item.title || ""} ${item.number || ""} ${item.students?.full_name || ""} ${item.guardians?.full_name || ""}`)).slice(0, 8);

  return NextResponse.json({
    ok: true,
    results: {
      students: studentRows.map((item: any) => ({ type: "student", id: item.id, title: item.full_name, subtitle: item.status, href: `/crm/students?student=${item.id}` })),
      guardians: guardianRows.map((item: any) => ({ type: "guardian", id: item.id, title: item.full_name, subtitle: [item.phone, item.email].filter(Boolean).join(" · "), href: `/crm/guardians?guardian=${item.id}` })),
      invoices: invoiceRows.map((item: any) => ({ type: "invoice", id: item.id, title: item.title || item.number, subtitle: `${item.status} · ${Number(item.amount || 0).toLocaleString("ru-RU")} ₽`, href: `/crm/invoices?invoice=${item.id}` })),
      groups: (groups.data || []).map((item: any) => ({ type: "group", id: item.id, title: item.title, subtitle: item.status, href: `/crm/groups?group=${item.id}` })),
    },
  });
}
