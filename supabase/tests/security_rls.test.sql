begin;
create extension if not exists pgtap;
select plan(12);

select ok(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
), 'every public business table has RLS enabled');

select ok(not exists (
  select 1 from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon' and privilege_type in ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES')
), 'anon has no direct private-table privileges');

select ok(not exists (
  select 1 from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'authenticated' and privilege_type in ('TRUNCATE','TRIGGER','REFERENCES')
), 'authenticated cannot truncate, trigger or reference business tables');

select ok(not has_function_privilege('anon', 'public.convert_lead_to_student(uuid,uuid)', 'EXECUTE'), 'anon cannot execute lead conversion');
select ok(not has_function_privilege('authenticated', 'public.convert_lead_to_student(uuid,uuid)', 'EXECUTE'), 'authenticated cannot execute service-only lead conversion');
select ok(not has_function_privilege('authenticated', 'public.calculate_invoice_status(uuid)', 'EXECUTE'), 'authenticated cannot probe invoice status RPC');
select ok(not has_function_privilege('authenticated', 'public.sync_invoice_status_from_payments(uuid)', 'EXECUTE'), 'authenticated cannot mutate invoice status RPC');
select ok(has_function_privilege('service_role', 'public.convert_lead_to_student(uuid,uuid)', 'EXECUTE'), 'service role retains lead conversion');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'security-a@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'security-b@example.invalid', '', now(), '{}', '{}', now(), now());
insert into public.profiles (id, full_name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Security A'), ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Security B');
insert into public.organizations (id, name, slug) values ('aaaaaaaa-0000-4000-8000-000000000000', 'Security Org A', 'security-org-a'), ('bbbbbbbb-0000-4000-8000-000000000000', 'Security Org B', 'security-org-b');
insert into public.org_memberships (organization_id, user_id, role) values ('aaaaaaaa-0000-4000-8000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'admin'), ('bbbbbbbb-0000-4000-8000-000000000000', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'admin');
insert into public.students (id, organization_id, full_name) values ('aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa', 'aaaaaaaa-0000-4000-8000-000000000000', 'Student A'), ('bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb', 'bbbbbbbb-0000-4000-8000-000000000000', 'Student B');

grant select on public.students, public.org_memberships to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select is((select count(*) from public.students where id = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'), 1::bigint, 'org A can read its own student through RLS');
select is((select count(*) from public.students where id = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb'), 0::bigint, 'org A cannot read org B student by UUID');
select is((select count(*) from public.org_memberships where organization_id = 'bbbbbbbb-0000-4000-8000-000000000000'), 0::bigint, 'org A cannot read org B membership');
select throws_ok($$truncate table public.students$$, '42501', null, 'authenticated cannot bypass RLS with truncate');

select * from finish();
rollback;
