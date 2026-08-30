begin;

create extension if not exists pgtap with schema extensions;
select plan(80);

select has_table('public', 'trial_events', 'trial event containers exist');
select has_table('public', 'trial_participants', 'trial participants exist');
select col_is_null('public', 'trial_events', 'lesson_session_id', 'lesson session is nullable for standalone trials');
select col_is_null('public', 'trial_participants', 'lead_id', 'lead subject is nullable');
select col_is_null('public', 'trial_participants', 'student_id', 'student subject is nullable');
select ok((select relrowsecurity from pg_class where oid = 'public.trial_events'::regclass), 'trial events use RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.trial_participants'::regclass), 'trial participants use RLS');
select ok(not has_function_privilege('authenticated', 'public.crm_create_trial_event(uuid,uuid,text,uuid,uuid,uuid,uuid,timestamptz,timestamptz,jsonb)', 'execute'), 'browser cannot execute trial creation RPC');
select ok(has_function_privilege('service_role', 'public.crm_create_trial_event(uuid,uuid,text,uuid,uuid,uuid,uuid,timestamptz,timestamptz,jsonb)', 'execute'), 'service role can execute trial creation RPC');
select ok(not has_function_privilege('authenticated', 'public.crm_record_trial_participant_result(uuid,uuid,uuid,text,text,text)', 'execute'), 'browser cannot execute participant result RPC');
select ok(not has_function_privilege('authenticated', 'public.crm_cancel_lesson_session_with_trials(uuid,uuid,uuid,text,text)', 'execute'), 'browser cannot execute lesson cancellation RPC');
select ok(has_function_privilege('service_role', 'public.crm_cancel_lesson_session_with_trials(uuid,uuid,uuid,text,text)', 'execute'), 'service role can execute lesson cancellation RPC');
select ok(
  pg_get_functiondef('public.crm_create_trial_event(uuid,uuid,text,uuid,uuid,uuid,uuid,timestamptz,timestamptz,jsonb)'::regprocedure) like '%assert_standalone_trial_slot%'
  and pg_get_functiondef('public.assert_standalone_trial_slot(uuid,uuid,uuid,uuid,timestamptz,timestamptz)'::regprocedure) like '%pg_advisory_xact_lock%',
  'standalone resource conflicts use transaction advisory locks'
);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('93000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','manager@trial.test','',now(),'{}','{}',now(),now()),
  ('93000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','teacher-one@trial.test','',now(),'{}','{}',now(),now()),
  ('93000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','teacher-two@trial.test','',now(),'{}','{}',now(),now()),
  ('93000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','other-manager@trial.test','',now(),'{}','{}',now(),now()),
  ('93000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@trial.test','',now(),'{}','{}',now(),now());

insert into public.organizations (id, name, slug) values
  ('93000000-0000-4000-8000-000000000010','Trial tenant','trial-tenant'),
  ('93000000-0000-4000-8000-000000000011','Other trial tenant','other-trial-tenant');
insert into public.profiles (id, full_name) values
  ('93000000-0000-4000-8000-000000000001','Trial manager'),
  ('93000000-0000-4000-8000-000000000002','Teacher One'),
  ('93000000-0000-4000-8000-000000000003','Teacher Two'),
  ('93000000-0000-4000-8000-000000000004','Other manager'),
  ('93000000-0000-4000-8000-000000000005','Trial admin');
insert into public.org_memberships (organization_id, user_id, role) values
  ('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','manager'),
  ('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000002','teacher'),
  ('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000003','teacher'),
  ('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000005','admin'),
  ('93000000-0000-4000-8000-000000000011','93000000-0000-4000-8000-000000000004','manager');

insert into public.branches (id, organization_id, name) values
  ('93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000010','Main branch'),
  ('93000000-0000-4000-8000-000000000021','93000000-0000-4000-8000-000000000010','Second branch'),
  ('93000000-0000-4000-8000-000000000022','93000000-0000-4000-8000-000000000011','Other branch');
insert into public.rooms (id, organization_id, branch_id, name, capacity) values
  ('93000000-0000-4000-8000-000000000030','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000020','Main room',4),
  ('93000000-0000-4000-8000-000000000031','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000020','Small room',1),
  ('93000000-0000-4000-8000-000000000032','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000020','No canonical limit',null),
  ('93000000-0000-4000-8000-000000000033','93000000-0000-4000-8000-000000000011','93000000-0000-4000-8000-000000000022','Other room',8);
insert into public.courses (id, organization_id, title, slug) values
  ('93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000010','Trial course','trial-course'),
  ('93000000-0000-4000-8000-000000000041','93000000-0000-4000-8000-000000000011','Other course','other-trial-course');
insert into public.groups (id, organization_id, course_id, branch_id, room_id, teacher_id, title, status, capacity) values
  ('93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000030','93000000-0000-4000-8000-000000000002','Capacity three','active',3),
  ('93000000-0000-4000-8000-000000000051','93000000-0000-4000-8000-000000000011','93000000-0000-4000-8000-000000000041','93000000-0000-4000-8000-000000000022','93000000-0000-4000-8000-000000000033',null,'Other group','active',8);

insert into public.students (id, organization_id, full_name, status) values
  ('93000000-0000-4000-8000-000000000060','93000000-0000-4000-8000-000000000010','Enrolled Student','active'),
  ('93000000-0000-4000-8000-000000000061','93000000-0000-4000-8000-000000000010','Makeup Student','active'),
  ('93000000-0000-4000-8000-000000000062','93000000-0000-4000-8000-000000000010','Trial Student','prospect'),
  ('93000000-0000-4000-8000-000000000063','93000000-0000-4000-8000-000000000011','Other Student','active');
insert into public.leads (id, organization_id, parent_name, parent_phone, child_name, status) values
  ('93000000-0000-4000-8000-000000000070','93000000-0000-4000-8000-000000000010','Lead One Parent','+70000000001','Lead One','contacted'),
  ('93000000-0000-4000-8000-000000000071','93000000-0000-4000-8000-000000000010','Lead Two Parent','+70000000002','Lead Two','lost'),
  ('93000000-0000-4000-8000-000000000072','93000000-0000-4000-8000-000000000010','Converted Parent','+70000000003','Converted Lead','converted'),
  ('93000000-0000-4000-8000-000000000073','93000000-0000-4000-8000-000000000011','Other Parent','+70000000004','Other Lead','new');
update public.leads
set student_id = '93000000-0000-4000-8000-000000000062'
where id = '93000000-0000-4000-8000-000000000072';
insert into public.enrollments (organization_id, student_id, group_id, status, started_on)
values ('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000060','93000000-0000-4000-8000-000000000050','active',current_date);

insert into public.lesson_sessions (id, organization_id, group_id, course_id, teacher_id, room_id, starts_at, ends_at, lesson_date, status, session_kind) values
  ('93000000-0000-4000-8000-000000000080','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000030','2099-09-01 09:00+03','2099-09-01 10:00+03','2099-09-01','planned','regular'),
  ('93000000-0000-4000-8000-000000000081','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000030','2099-09-01 12:00+03','2099-09-01 13:00+03','2099-09-01','planned','regular'),
  ('93000000-0000-4000-8000-000000000082','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000030','2099-09-02 14:00+03','2099-09-02 15:00+03','2099-09-02','planned','regular'),
  ('93000000-0000-4000-8000-000000000083','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000030','2020-08-20 09:00+03','2020-08-20 10:00+03','2020-08-20','completed','regular');
insert into public.attendance (id, organization_id, group_id, student_id, lesson_session_id, lesson_date, is_present, attendance_status)
values ('93000000-0000-4000-8000-000000000084','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000061','93000000-0000-4000-8000-000000000083','2020-08-20',false,'absent_excused');
insert into public.makeup_assignments (id, organization_id, source_attendance_id, student_id, target_session_id, status)
values ('93000000-0000-4000-8000-000000000085','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000084','93000000-0000-4000-8000-000000000061','93000000-0000-4000-8000-000000000080','scheduled');
insert into public.attendance (id, organization_id, group_id, student_id, lesson_session_id, lesson_date, is_present, attendance_status)
values ('93000000-0000-4000-8000-000000000090','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000062','93000000-0000-4000-8000-000000000083','2020-08-20',false,'absent_excused');
insert into public.makeup_assignments (id, organization_id, source_attendance_id, student_id, status)
values ('93000000-0000-4000-8000-000000000091','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000090','93000000-0000-4000-8000-000000000062','requested');

create temporary table trial_side_effect_baseline as
select
  (select count(*) from public.enrollments) enrollments,
  (select count(*) from public.attendance) attendance,
  (select count(*) from public.invoices) invoices,
  (select count(*) from public.payments) payments,
  (select count(*) from public.billing_accounts) billing_accounts,
  (select count(*) from public.teacher_payroll_entries) payroll,
  (select count(*) from public.homework_assignments) homework;

select lives_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','attached_session',
  '93000000-0000-4000-8000-000000000080',null,null,null,null,null,
  '[{"lead_id":"93000000-0000-4000-8000-000000000070"}]'::jsonb
)$$, 'attached lead fits after enrollment and scheduled makeup');
select is((select count(*)::integer from public.trial_events where lesson_session_id='93000000-0000-4000-8000-000000000080'),1,'one attached container is created');
select is((select count(*)::integer from public.trial_participants where lead_id='93000000-0000-4000-8000-000000000070'),1,'lead participant is created');
select is((select status::text from public.leads where id='93000000-0000-4000-8000-000000000070'),'trial_scheduled','contacted lead advances to trial scheduled');
select is((select count(*)::integer from public.lead_interactions where lead_id='93000000-0000-4000-8000-000000000070' and type='meeting' and result='scheduled_trial'),1,'trial creation writes lead interaction');

select throws_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','attached_session',
  '93000000-0000-4000-8000-000000000080',null,null,null,null,null,
  '[{"student_id":"93000000-0000-4000-8000-000000000060"}]'::jsonb
)$$,'trial_subject_already_occupies_session','an already-enrolled student cannot be added again as a trial guest');
select is((select count(*)::integer from public.trial_events where lesson_session_id='93000000-0000-4000-8000-000000000080'),1,'later participant reuses attached container');
select throws_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','attached_session',
  '93000000-0000-4000-8000-000000000080',null,null,null,null,null,
  '[{"student_id":"93000000-0000-4000-8000-000000000061"}]'::jsonb
)$$,'trial_subject_already_occupies_session','a scheduled makeup student cannot be added again as a trial guest');
select throws_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','attached_session',
  '93000000-0000-4000-8000-000000000080',null,null,null,null,null,
  '[{"lead_id":"93000000-0000-4000-8000-000000000071"}]'::jsonb
)$$,'trial_capacity_exceeded:0','overflow is rejected after capacity is recomputed under lock');
select is((select status::text from public.leads where id='93000000-0000-4000-8000-000000000071'),'lost','failed batch does not reactivate a lead');
select throws_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','attached_session',
  '93000000-0000-4000-8000-000000000081',null,null,null,null,null,
  '[{"lead_id":"93000000-0000-4000-8000-000000000070"},{"lead_id":"93000000-0000-4000-8000-000000000071"},{"student_id":"93000000-0000-4000-8000-000000000062"}]'::jsonb
)$$,'trial_capacity_exceeded:2','whole participant batch fails when one more seat than available is requested');
select is((select count(*)::integer from public.trial_events where lesson_session_id='93000000-0000-4000-8000-000000000081'),0,'overflow leaves no half-created event');
select throws_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','attached_session',
  '93000000-0000-4000-8000-000000000081',null,null,null,null,null,
  '[{"lead_id":"93000000-0000-4000-8000-000000000073"}]'::jsonb
)$$,'trial_subject_wrong_organization','cross-tenant subject is rejected');
select throws_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','standalone',
  null,'93000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000020',null,
  '2099-09-06 10:00+03','2099-09-06 11:00+03','[{"lead_id":"93000000-0000-4000-8000-000000000072"},{"student_id":"93000000-0000-4000-8000-000000000062"}]'::jsonb
)$$,'trial_subject_duplicate','a lead linked to the selected student cannot consume a second seat in the same batch');

select lives_ok(format($sql$select public.crm_record_trial_participant_result(
  '93000000-0000-4000-8000-000000000010','%s','93000000-0000-4000-8000-000000000001','cancelled',null,'Перенесли запись'
)$sql$,(select id from public.trial_participants where lead_id='93000000-0000-4000-8000-000000000070')),'participant cancellation is transactional');
select is((select status from public.trial_participants where lead_id='93000000-0000-4000-8000-000000000070'),'cancelled','cancelled participant is soft retained');
update public.leads set student_id='93000000-0000-4000-8000-000000000060' where id='93000000-0000-4000-8000-000000000070';
select throws_ok(format($sql$select public.crm_record_trial_participant_result(
  '93000000-0000-4000-8000-000000000010','%s','93000000-0000-4000-8000-000000000001','scheduled',null,'Возвращаем запись'
)$sql$,(select id from public.trial_participants where lead_id='93000000-0000-4000-8000-000000000070' and status='cancelled' limit 1)),'trial_subject_already_occupies_session','a cancelled lead linked to an enrolled student cannot reclaim a duplicate seat');
update public.leads set student_id=null where id='93000000-0000-4000-8000-000000000070';
select lives_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','attached_session',
  '93000000-0000-4000-8000-000000000080',null,null,null,null,null,
  '[{"lead_id":"93000000-0000-4000-8000-000000000071"}]'::jsonb
)$$,'cancelled participant releases an attached seat');
select is((select status::text from public.leads where id='93000000-0000-4000-8000-000000000071'),'trial_scheduled','lost lead is deliberately reactivated by a successful trial');

select throws_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','standalone',
  null,'93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000021','93000000-0000-4000-8000-000000000030',
  '2099-09-03 10:00+03','2099-09-03 11:00+03','[{"student_id":"93000000-0000-4000-8000-000000000062"}]'::jsonb
)$$,'trial_room_branch_mismatch','room must belong to the selected branch');
select throws_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','standalone',
  null,'93000000-0000-4000-8000-000000000004','93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000030',
  '2099-09-03 10:00+03','2099-09-03 11:00+03','[{"student_id":"93000000-0000-4000-8000-000000000062"}]'::jsonb
)$$,'trial_teacher_not_active','cross-tenant/non-teacher staff cannot be selected as teacher');
select throws_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','standalone',
  null,'93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000030',
  '2099-09-02 14:30+03','2099-09-02 15:30+03','[{"student_id":"93000000-0000-4000-8000-000000000062"}]'::jsonb
)$$,'trial_slot_conflict','standalone trial cannot overlap a planned ordinary lesson');
select lives_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','standalone',
  null,'93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000030',
  '2099-09-02 15:00+03','2099-09-02 16:00+03','[{"student_id":"93000000-0000-4000-8000-000000000062"}]'::jsonb
)$$,'adjacent standalone trial is allowed');
select throws_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','standalone',
  null,'93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000032',
  '2099-09-02 15:30+03','2099-09-02 16:30+03','[{"lead_id":"93000000-0000-4000-8000-000000000072"}]'::jsonb
)$$,'trial_slot_conflict','teacher conflict is detected across standalone trials');
select throws_ok($$insert into public.lesson_sessions (
  id,organization_id,group_id,course_id,teacher_id,room_id,starts_at,ends_at,lesson_date,status,session_kind
) values (
  '93000000-0000-4000-8000-000000000086','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000031','2099-09-02 15:30+03','2099-09-02 16:30+03','2099-09-02','planned','regular'
)$$,'trial_slot_conflict','ordinary lesson creation cannot overlap an existing standalone trial teacher');
select throws_ok($$insert into public.lesson_sessions (
  id,organization_id,group_id,course_id,teacher_id,room_id,starts_at,ends_at,lesson_date,status,session_kind
) values (
  '93000000-0000-4000-8000-000000000087','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000030','2099-09-02 15:30+03','2099-09-02 16:30+03','2099-09-02','planned','regular'
)$$,'trial_slot_conflict','ordinary lesson creation cannot overlap an existing standalone trial room');
select throws_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','standalone',
  null,'93000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000030',
  '2099-09-02 14:30+03','2099-09-02 15:30+03','[{"lead_id":"93000000-0000-4000-8000-000000000072"}]'::jsonb
)$$,'trial_slot_conflict','room conflict is detected against an ordinary lesson');
select throws_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','standalone',
  null,'93000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000030',
  '2099-09-02 15:30+03','2099-09-02 16:30+03','[{"lead_id":"93000000-0000-4000-8000-000000000072"}]'::jsonb
)$$,'trial_slot_conflict','room conflict is detected against another standalone trial');
select throws_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','standalone',
  null,'93000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000031',
  '2099-09-04 10:00+03','2099-09-04 11:00+03','[{"lead_id":"93000000-0000-4000-8000-000000000070"},{"student_id":"93000000-0000-4000-8000-000000000062"}]'::jsonb
)$$,'trial_capacity_exceeded:1','canonical standalone room capacity is enforced');
select lives_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','standalone',
  null,'93000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000032',
  '2099-09-04 10:00+03','2099-09-04 11:00+03','[{"lead_id":"93000000-0000-4000-8000-000000000070"},{"student_id":"93000000-0000-4000-8000-000000000062"}]'::jsonb
)$$,'standalone room without canonical capacity accepts a multi-participant batch');
select lives_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','standalone',
  null,'93000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000020',null,
  '2099-09-05 10:00+03','2099-09-05 11:00+03','[{"student_id":"93000000-0000-4000-8000-000000000062"}]'::jsonb
)$$,'standalone trial can be created without a room');
select lives_ok(format($sql$select public.crm_update_trial_event(
  '93000000-0000-4000-8000-000000000010','%s','93000000-0000-4000-8000-000000000001','update',
  '93000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000020',null,
  '2099-09-05 11:00+03','2099-09-05 12:00+03',null
)$sql$,(select id from public.trial_events where mode='standalone' and room_id is null limit 1)),'standalone trial can be rescheduled transactionally');
select is((select to_char(starts_at at time zone 'Europe/Moscow','HH24:MI') from public.trial_events where mode='standalone' and room_id is null limit 1),'11:00','standalone reschedule persists the new time');
select throws_ok(format($sql$select public.crm_update_trial_event(
  '93000000-0000-4000-8000-000000000010','%s','93000000-0000-4000-8000-000000000001','update',
  '93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000020',null,
  '2099-09-02 14:30+03','2099-09-02 15:30+03',null
)$sql$,(select id from public.trial_events where mode='standalone' and room_id is null limit 1)),'trial_slot_conflict','standalone reschedule rejects a conflicting teacher slot');
select lives_ok(format($sql$select public.crm_update_trial_event(
  '93000000-0000-4000-8000-000000000010','%s','93000000-0000-4000-8000-000000000001','cancel',
  null,null,null,null,null,'Отменено менеджером'
)$sql$,(select id from public.trial_events where mode='standalone' and room_id is null limit 1)),'whole standalone event can be cancelled transactionally');
select ok(not exists(
  select 1 from public.trial_participants participant
  join public.trial_events event on event.id=participant.trial_event_id
  where event.mode='standalone' and event.room_id is null and participant.status <> 'cancelled'
),'whole-event cancellation soft-cancels every participant');

select throws_ok($$update public.makeup_assignments
  set target_session_id='93000000-0000-4000-8000-000000000080',status='scheduled'
  where id='93000000-0000-4000-8000-000000000091'$$,'group_session_capacity_exceeded','makeup scheduling cannot overbook seats already occupied by trials');
select throws_ok($$insert into public.enrollments (organization_id,student_id,group_id,status,started_on)
  values ('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000062','93000000-0000-4000-8000-000000000050','active',current_date)$$,'group_session_capacity_exceeded','new enrollment cannot overbook a future session already occupied by trials');

select lives_ok($$select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','attached_session',
  '93000000-0000-4000-8000-000000000082',null,null,null,null,null,
  '[{"lead_id":"93000000-0000-4000-8000-000000000070"}]'::jsonb
)$$,'attached participant can be prepared for lesson lifecycle checks');
select lives_ok($$select public.reschedule_lesson_session(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000082',
  '2099-09-07 14:00+03','2099-09-07 15:00+03','Перенос группы'
)$$,'lesson and attached trial are rescheduled in one transaction');
select is((select status::text from public.lesson_sessions where id='93000000-0000-4000-8000-000000000082'),'moved','source lesson is marked moved');
select is((select session.status::text from public.trial_events event join public.lesson_sessions session on session.id=event.lesson_session_id where event.mode='attached_session' and session.rescheduled_from_session_id='93000000-0000-4000-8000-000000000082'),'planned','attached trial follows the planned replacement lesson');
select lives_ok(format($sql$select public.crm_cancel_lesson_session_with_trials(
  '93000000-0000-4000-8000-000000000010','%s','93000000-0000-4000-8000-000000000001','Отмена группы','not_required'
)$sql$,(select event.lesson_session_id from public.trial_events event join public.lesson_sessions session on session.id=event.lesson_session_id where session.rescheduled_from_session_id='93000000-0000-4000-8000-000000000082')),'lesson cancellation and attached guests are handled atomically');
select is((select participant.status from public.trial_participants participant join public.trial_events event on event.id=participant.trial_event_id join public.lesson_sessions session on session.id=event.lesson_session_id where session.rescheduled_from_session_id='93000000-0000-4000-8000-000000000082' limit 1),'cancelled','lesson cancellation soft-cancels its attached participant');
select ok(exists(select 1 from public.lead_interactions where lead_id='93000000-0000-4000-8000-000000000070' and summary like 'Пробная запись отменена вместе с занятием.%'),'lesson cancellation writes participant CRM history');

insert into public.group_schedule_rules (id,organization_id,group_id,weekday,starts_at,ends_at)
values ('93000000-0000-4000-8000-000000000092','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050',3,'09:00','10:00');
create temporary table protected_trial_occurrence as
select (
  current_date
  + (14 + mod(3 - extract(isodow from current_date)::integer + 7, 7))
)::date as lesson_date;
insert into public.lesson_sessions (
  id,organization_id,group_id,course_id,teacher_id,room_id,schedule_rule_id,starts_at,ends_at,lesson_date,status,session_kind
) select
  '93000000-0000-4000-8000-000000000093','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','93000000-0000-4000-8000-000000000040','93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000030','93000000-0000-4000-8000-000000000092',
  (lesson_date + time '09:00') at time zone 'Europe/Moscow',
  (lesson_date + time '10:00') at time zone 'Europe/Moscow',
  lesson_date,'planned','regular'
from protected_trial_occurrence;
select public.crm_create_trial_event(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','attached_session',
  '93000000-0000-4000-8000-000000000093',null,null,null,null,null,
  '[{"lead_id":"93000000-0000-4000-8000-000000000072"}]'::jsonb
);
select lives_ok($$select public.replace_group_schedule(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050',
  '[{"weekday":3,"starts_at":"09:00","ends_at":"10:00"}]'::jsonb,true
)$$,'weekly schedule rebuild keeps an attached trial appointment valid');
select is((select lesson_session_id from public.trial_events where lesson_session_id='93000000-0000-4000-8000-000000000093'),'93000000-0000-4000-8000-000000000093'::uuid,'attached event still references its canonical lesson after rebuild');
select ok((select schedule_rule_id is not null from public.lesson_sessions where id='93000000-0000-4000-8000-000000000093'),'matching rebuilt rule re-adopts the protected lesson');
select lives_ok($$select public.replace_group_schedule(
  '93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000050','[]'::jsonb,true
)$$,'clearing weekly rules preserves a lesson with an attached trial as an explicit exception');
select ok(exists(select 1 from public.lesson_sessions where id='93000000-0000-4000-8000-000000000093' and schedule_rule_id is null),'protected trial lesson remains without a deleted rule reference');

update public.lesson_sessions set status='completed' where id='93000000-0000-4000-8000-000000000080';
select lives_ok(format($sql$select public.crm_record_trial_participant_result(
  '93000000-0000-4000-8000-000000000010','%s','93000000-0000-4000-8000-000000000002','attended','enrolled','Результат внесён после завершения'
)$sql$,(select id from public.trial_participants where lead_id='93000000-0000-4000-8000-000000000071' and status <> 'cancelled' limit 1)),'own teacher can record an attached trial result after lesson completion');
select is((select result from public.trial_participants where lead_id='93000000-0000-4000-8000-000000000071' and status='attended' limit 1),'enrolled','post-completion trial result is persisted');
select is((select status::text from public.leads where id='93000000-0000-4000-8000-000000000072'),'converted','converted lead is never regressed by trial scheduling');

select throws_ok(format($sql$select public.crm_record_trial_participant_result(
  '93000000-0000-4000-8000-000000000010','%s','93000000-0000-4000-8000-000000000003','attended','interested','Чужой преподаватель'
)$sql$,(select tp.id from public.trial_participants tp join public.trial_events te on te.id=tp.trial_event_id where te.mode='standalone' and te.teacher_id='93000000-0000-4000-8000-000000000002' limit 1)),'trial_forbidden','another teacher cannot update a participant');
select lives_ok(format($sql$select public.crm_record_trial_participant_result(
  '93000000-0000-4000-8000-000000000010','%s','93000000-0000-4000-8000-000000000002','attended','interested','Готовы продолжать'
)$sql$,(select tp.id from public.trial_participants tp join public.trial_events te on te.id=tp.trial_event_id where te.mode='standalone' and te.teacher_id='93000000-0000-4000-8000-000000000002' limit 1)),'own teacher can record a standalone trial result');
select is((select result from public.trial_participants tp join public.trial_events te on te.id=tp.trial_event_id where te.mode='standalone' and te.teacher_id='93000000-0000-4000-8000-000000000002' limit 1),'interested','trial result is stored separately from attendance');
select ok((select count(*) from public.lead_interactions where type='comment' and summary like 'Результат пробного занятия:%') >= 2,'participant updates write CRM history interactions');

update public.org_memberships
set is_active=false
where organization_id='93000000-0000-4000-8000-000000000010'
  and user_id='93000000-0000-4000-8000-000000000001';
select lives_ok(format($sql$select public.crm_update_trial_event(
  '93000000-0000-4000-8000-000000000010','%s','93000000-0000-4000-8000-000000000005','update',
  '93000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000032',
  '2099-09-11 10:00+03','2099-09-11 11:00+03',null
)$sql$,(select id from public.trial_events where mode='standalone' and room_id='93000000-0000-4000-8000-000000000032' and starts_at='2099-09-04 10:00+03' limit 1)),'an active admin can edit an event after its original creator is deactivated');
select is((select created_by from public.trial_events where mode='standalone' and room_id='93000000-0000-4000-8000-000000000032' and starts_at='2099-09-11 10:00+03' limit 1),'93000000-0000-4000-8000-000000000001'::uuid,'deactivated creator remains an immutable audit reference');
update public.org_memberships
set is_active=true
where organization_id='93000000-0000-4000-8000-000000000010'
  and user_id='93000000-0000-4000-8000-000000000001';

select is((select count(*) from public.enrollments),(select enrollments from trial_side_effect_baseline),'trials do not create or alter enrollment rows');
select is((select count(*) from public.attendance),(select attendance from trial_side_effect_baseline),'trials do not create ordinary attendance rows');
select is((select count(*) from public.invoices),(select invoices from trial_side_effect_baseline),'trials do not create invoices');
select is((select count(*) from public.payments),(select payments from trial_side_effect_baseline),'trials do not create payments');
select is((select count(*) from public.billing_accounts),(select billing_accounts from trial_side_effect_baseline),'trials do not create billing accounts');
select is((select count(*) from public.teacher_payroll_entries),(select payroll from trial_side_effect_baseline),'trials do not create teacher payroll');
select is((select count(*) from public.homework_assignments),(select homework from trial_side_effect_baseline),'trials do not create homework');
select is((select count(*)::integer from public.lesson_sessions where id in (select id from public.trial_events where mode='standalone')),0,'standalone trials do not create fake lesson sessions');

select * from finish();
rollback;
