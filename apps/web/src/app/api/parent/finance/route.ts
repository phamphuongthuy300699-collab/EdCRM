import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Необходима авторизация" }, { status: 401 });
  const admin = createSupabaseAdminClient();
  const { data: links } = await admin.from("guardian_users").select("organization_id, guardian_id").eq("user_id", user.id);
  if (!links?.length) return NextResponse.json({ ok: true, accounts: [] });
  const pairs = links.map((link: any) => `${link.organization_id}:${link.guardian_id}`);
  const guardianIds = links.map((link: any) => link.guardian_id);
  const { data: accounts, error } = await admin.from("billing_accounts").select("id, organization_id, guardian_id, balance, updated_at").in("guardian_id", guardianIds);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const ownAccounts = (accounts || []).filter((account: any) => pairs.includes(`${account.organization_id}:${account.guardian_id}`));
  const accountIds = ownAccounts.map((account: any) => account.id);
  const { data: ledger } = accountIds.length ? await admin.from("billing_ledger_entries").select("id, account_id, entry_type, amount, reason, created_at, students(full_name), invoices(number, title), lesson_sessions(lesson_date, groups(title))").in("account_id", accountIds).order("created_at", { ascending: false }).limit(200) : { data: [] };
  return NextResponse.json({ ok: true, accounts: ownAccounts.map((account: any) => ({ ...account, ledger: (ledger || []).filter((entry: any) => entry.account_id === account.id) })) });
}
