begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('94000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'modern-staff@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('94000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'legacy-login@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('94000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other-login@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.organizations (id, name, slug)
values ('94000000-0000-4000-8000-000000000020', 'Staff identity B', 'staff-identity-b');

insert into public.profiles (id, full_name) values
  ('94000000-0000-4000-8000-000000000001', 'Modern teacher'),
  ('94000000-0000-4000-8000-000000000004', 'Second legacy teacher');

insert into public.org_memberships (organization_id, user_id, role, is_active) values
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', '94000000-0000-4000-8000-000000000001', 'teacher', true),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', '94000000-0000-4000-8000-000000000004', 'teacher', true);

insert into public.courses (id, organization_id, title, slug)
values ('94000000-0000-4000-8000-000000000030', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Legacy UUID course', 'legacy-uuid-course');
insert into public.groups (id, organization_id, course_id, teacher_id, title, status)
values ('94000000-0000-4000-8000-000000000040', 'a3848a60-a292-491a-85eb-7f2824cf4e77', '94000000-0000-4000-8000-000000000030', 'a2222222-e222-3333-4444-555555555555', 'Legacy teacher group', 'active');

select has_table('public', 'staff_auth_identities', 'staff identity mapping table exists');
select col_is_pk('public', 'staff_auth_identities', array['organization_id', 'staff_profile_id'], 'organization and canonical profile form the primary key');

insert into public.staff_auth_identities (organization_id, staff_profile_id, auth_user_id, created_by)
values (
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  'a2222222-e222-3333-4444-555555555555',
  '94000000-0000-4000-8000-000000000002',
  '94000000-0000-4000-8000-000000000001'
);

select is(
  (select staff_profile_id from public.staff_auth_identities where auth_user_id = '94000000-0000-4000-8000-000000000002'),
  'a2222222-e222-3333-4444-555555555555'::uuid,
  'mapped Auth identity resolves to the canonical legacy profile'
);

select throws_ok(
  $$insert into public.staff_auth_identities (organization_id, staff_profile_id, auth_user_id)
    values ('a3848a60-a292-491a-85eb-7f2824cf4e77', '94000000-0000-4000-8000-000000000004', '94000000-0000-4000-8000-000000000002')$$,
  '23505', null,
  'one Auth identity cannot map to a second staff profile'
);

select throws_ok(
  $$insert into public.staff_auth_identities (organization_id, staff_profile_id, auth_user_id)
    values ('94000000-0000-4000-8000-000000000020', '94000000-0000-4000-8000-000000000004', '94000000-0000-4000-8000-000000000003')$$,
  '23514', 'staff_profile_not_in_organization',
  'cross-organization mappings are rejected'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000002', true);

select is(
  public.current_staff_profile_id('a3848a60-a292-491a-85eb-7f2824cf4e77'),
  'a2222222-e222-3333-4444-555555555555'::uuid,
  'mapped login resolves to canonical staff profile'
);
select ok(public.is_org_member('a3848a60-a292-491a-85eb-7f2824cf4e77'), 'mapped legacy staff is an organization member');
select ok(public.has_org_role('a3848a60-a292-491a-85eb-7f2824cf4e77', array['teacher']::public.app_role[]), 'mapped legacy staff keeps its canonical role');
select ok(public.is_teacher_of_group('94000000-0000-4000-8000-000000000040'), 'mapped legacy teacher owns the canonical group');

select set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000001', true);
select is(
  public.current_staff_profile_id('a3848a60-a292-491a-85eb-7f2824cf4e77'),
  '94000000-0000-4000-8000-000000000001'::uuid,
  'modern direct identity remains backward compatible without a required mapping'
);

reset role;
update public.org_memberships set is_active = false
where organization_id = 'a3848a60-a292-491a-85eb-7f2824cf4e77'
  and user_id = 'a2222222-e222-3333-4444-555555555555';
set local role authenticated;
select set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000002', true);
select is(public.current_staff_profile_id('a3848a60-a292-491a-85eb-7f2824cf4e77'), null::uuid, 'inactive membership immediately blocks mapped application access');

reset role;
select ok(has_function_privilege('authenticated', 'public.current_staff_profile_id(uuid)', 'EXECUTE'), 'authenticated may execute the RLS identity helper');
select ok(not has_function_privilege('anon', 'public.current_staff_profile_id(uuid)', 'EXECUTE'), 'anon cannot resolve staff identities');
select ok(not has_table_privilege('authenticated', 'public.staff_auth_identities', 'INSERT'), 'browser users cannot create identity mappings');
select ok(has_table_privilege('service_role', 'public.staff_auth_identities', 'SELECT'), 'service role can resolve mappings for server APIs');

select * from finish();
rollback;
