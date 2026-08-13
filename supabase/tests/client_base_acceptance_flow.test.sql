begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values('93000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','acceptance-manager@example.test','',now(),'{}','{}',now(),now());
insert into public.organizations(id,name,slug) values('93000000-0000-4000-8000-000000000010','Acceptance tenant','acceptance-tenant');
insert into public.profiles(id,full_name) values('93000000-0000-4000-8000-000000000001','Acceptance manager');
insert into public.org_memberships(organization_id,user_id,role,is_active) values('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000001','manager',true);

insert into public.guardians(id,organization_id,full_name,phone,status,source)
values('93000000-0000-4000-8000-000000000020','93000000-0000-4000-8000-000000000010','Acceptance parent','+7 000 000-00-03','prospect','manual');
select is((select count(*)::int from public.student_guardians where guardian_id='93000000-0000-4000-8000-000000000020'),0,'guardian starts without a child');

select lives_ok($$select public.crm_record_interaction('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000020',null,null,'93000000-0000-4000-8000-000000000001','call','interested','Interested in autumn',now()+interval '1 day',null)$$,'interaction and follow-up are created');
select is((select count(*)::int from public.crm_followup_queue('93000000-0000-4000-8000-000000000010')),1,'follow-up appears in the real database queue');

select lives_ok($$select public.crm_record_interaction('93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000020',null,null,'93000000-0000-4000-8000-000000000001','call','answered','Followed up',now()+interval '30 day',(select id from public.lead_interactions where guardian_id='93000000-0000-4000-8000-000000000020' order by created_at limit 1))$$,'old follow-up is completed and rescheduled atomically');
select is((select count(*)::int from public.lead_interactions where guardian_id='93000000-0000-4000-8000-000000000020' and next_action_completed_at is null and next_action_at is not null),1,'only the replacement follow-up remains open');

select lives_ok($$select public.crm_create_student_with_guardians('93000000-0000-4000-8000-000000000010',jsonb_build_object('full_name','Acceptance child','status','prospect'),jsonb_build_array(jsonb_build_object('guardian_id','93000000-0000-4000-8000-000000000020','relation','Родитель','is_primary',true,'is_billing_contact',true)),null)$$,'child is created and linked later without a group');
select is((select count(*)::int from public.enrollments e join public.students s on s.id=e.student_id where s.full_name='Acceptance child'),0,'linking creates no automatic enrollment');

insert into public.courses(id,organization_id,title,slug) values('93000000-0000-4000-8000-000000000030','93000000-0000-4000-8000-000000000010','Acceptance course','acceptance-course');
insert into public.groups(id,organization_id,course_id,title,status) values('93000000-0000-4000-8000-000000000031','93000000-0000-4000-8000-000000000010','93000000-0000-4000-8000-000000000030','Acceptance group','active');
insert into public.enrollments(organization_id,student_id,group_id,status) select '93000000-0000-4000-8000-000000000010',id,'93000000-0000-4000-8000-000000000031','active' from public.students where full_name='Acceptance child';
select is((select count(*)::int from public.enrollments e join public.students s on s.id=e.student_id where s.full_name='Acceptance child' and e.status='active'),1,'child is enrolled later');

update public.guardians set status='inactive' where id='93000000-0000-4000-8000-000000000020';
select is((select status from public.guardians where id='93000000-0000-4000-8000-000000000020'),'inactive','guardian becomes inactive without losing history');
select is((select count(*)::int from public.crm_followup_queue('93000000-0000-4000-8000-000000000010')),1,'inactive guardian remains eligible for future follow-up');
update public.guardians set status='active' where id='93000000-0000-4000-8000-000000000020';
select is((select status from public.guardians where id='93000000-0000-4000-8000-000000000020'),'active','guardian can be reactivated');
update public.guardians set status='do_not_contact' where id='93000000-0000-4000-8000-000000000020';
select is((select count(*)::int from public.crm_followup_queue('93000000-0000-4000-8000-000000000010')),0,'do-not-contact guardian is excluded');

select * from finish();
rollback;
