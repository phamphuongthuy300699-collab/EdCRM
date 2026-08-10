import { NextResponse } from "next/server";
import { csvResponse } from "@/lib/finance/csv";
import { crmAdmin, requireCrmStaff } from "../../_shared";

const roles = new Set(["owner", "admin", "accountant", "manager"]);
const related = (value: any) => Array.isArray(value) ? value[0] : value;

export async function GET(request: Request) {
  const access = await requireCrmStaff(roles);
  if (!access.ok) return access.response;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  if (type !== "ledger") return NextResponse.json({ ok: false, error: "Неизвестный экспорт" }, { status: 400 });
  const accountId = searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ ok: false, error: "Не выбран лицевой счёт" }, { status: 400 });
  const admin = crmAdmin() as any;
  const { data: account } = await admin.from("billing_accounts").select("id").eq("organization_id", access.organizationId).eq("id", accountId).maybeSingle();
  if (!account) return NextResponse.json({ ok: false, error: "Лицевой счёт не найден" }, { status: 404 });
  const { data, error } = await admin.from("billing_ledger_entries")
    .select("entry_type, amount, reason, created_at, students(full_name), invoices(number), lesson_sessions(lesson_date, groups(title))")
    .eq("organization_id", access.organizationId).eq("account_id", accountId).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return csvResponse("account-ledger.csv", ["Дата", "Тип", "Сумма", "Причина", "Ученик", "Счёт", "Группа"], (data || []).map((entry: any) => [
    new Date(entry.created_at).toLocaleString("ru-RU"), entry.entry_type, entry.amount, entry.reason || "",
    related(entry.students)?.full_name || "", related(entry.invoices)?.number || "", related(related(entry.lesson_sessions)?.groups)?.title || "",
  ]));
}
