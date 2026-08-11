-- Defense in depth for the exposed public schema. RLS remains enabled on every table.
revoke all privileges on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
-- Provider credentials are server-only. Browser users must use the sanitized Next API.
revoke all privileges on table public.payment_provider_settings from anon, authenticated;

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke truncate, references, trigger on tables from authenticated;

do $$
declare fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.signature);
    execute format('grant execute on function %s to service_role', fn.signature);
  end loop;
end $$;

-- These helpers are deliberately callable by authenticated users because RLS policies invoke them.
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.is_guardian_of_student(uuid) to authenticated;
grant execute on function public.is_student_user(uuid) to authenticated;
grant execute on function public.is_teacher_of_group(uuid) to authenticated;

alter function public.convert_lead_to_student(uuid, uuid) set search_path = public;
