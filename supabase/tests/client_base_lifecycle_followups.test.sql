begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('92000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','manager@client.test','',now(),'{}','{}',now(),now());
insert into public.organizations (id,name,slug) values
 ('92000000-0000-4000-8000-000000000010','Client test','client-test'),
 ('92000000-0000-4000-8000-000000000011','Other tenant','other-client-test');
insert into public.profiles (id,full_name) values ('92000000-0000-4000-8000-000000000001','Test manager');
insert into public.org_memberships (organization_id,user_id,role) values ('92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000001','manager');

insert into public.guardians (id,organization_id,full_name,status) values
 ('92000000-0000-4000-8000-000000000090','92000000-0000-4000-8000-000000000011','Other guardian','active');
insert into public.students (id,organization_id,full_name,status) values
 ('92000000-0000-4000-8000-000000000091','92000000-0000-4000-8000-000000000011','Other student','active');
insert into public.leads (id,organization_id,parent_name,parent_phone,status) values
 ('92000000-0000-4000-8000-000000000092','92000000-0000-4000-8000-000000000011','Other lead','+70000000002','new');

select lives_ok($$insert into public.guardians (id,organization_id,full_name,status,source,tags,interest_notes) values
 ('92000000-0000-4000-8000-000000000020','92000000-0000-4000-8000-000000000010','Анна Тестовая','prospect','manual',array['python'],'Осень'),
 ('92000000-0000-4000-8000-000000000021','92000000-0000-4000-8000-000000000010','Не звонить','do_not_contact','call','{}',null),
 ('92000000-0000-4000-8000-000000000022','92000000-0000-4000-8000-000000000010','Дубль','active','manual','{}',null)$$,
 'guardian lifecycle values and CRM fields are accepted');

select lives_ok($$select public.crm_create_student_with_guardians(
 '92000000-0000-4000-8000-000000000010', jsonb_build_object('full_name','Иван Тестовый','status','prospect'), '[]'::jsonb, null)$$,
 'student can be created without guardian and group');
select is((select count(*)::int from public.student_guardians),0,'independent student creates no fake relation');
select is((select count(*)::int from public.enrollments),0,'independent student creates no fake enrollment');
select is((select count(*)::int from public.billing_accounts),0,'independent student creates no billing account');

select public.crm_link_student_guardian('92000000-0000-4000-8000-000000000010',(select id from public.students where full_name='Иван Тестовый'),'92000000-0000-4000-8000-000000000020','Родитель',true,true);
select is((select count(*)::int from public.student_guardians),1,'guardian can be linked later');
select throws_ok($$select public.crm_link_student_guardian('92000000-0000-4000-8000-000000000010',(select id from public.students where full_name='Иван Тестовый'),'92000000-0000-4000-8000-000000000020','Родитель',false,false)$$,'student_guardian_already_exists','duplicate relation is rejected');
select public.crm_link_student_guardian('92000000-0000-4000-8000-000000000010',(select id from public.students where full_name='Иван Тестовый'),'92000000-0000-4000-8000-000000000022','Родитель',false,true);
select ok((select is_billing_contact from public.student_guardians where guardian_id='92000000-0000-4000-8000-000000000022'),'new billing contact is selected');
select ok(not (select is_billing_contact from public.student_guardians where guardian_id='92000000-0000-4000-8000-000000000020'),'old billing contact is removed atomically');

insert into public.leads (id,organization_id,parent_name,parent_phone,status) values ('92000000-0000-4000-8000-000000000030','92000000-0000-4000-8000-000000000010','Анна Тестовая','+70000000000','contacted');
insert into public.lead_interactions (id,organization_id,lead_id,guardian_id,manager_id,type,result,summary,next_action_at) values
 ('92000000-0000-4000-8000-000000000040','92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000030','92000000-0000-4000-8000-000000000020','92000000-0000-4000-8000-000000000001','call','answered','Python',now()-interval '1 day');
insert into public.lead_interactions (id,organization_id,student_id,type,summary,next_action_at) values
 ('92000000-0000-4000-8000-000000000041','92000000-0000-4000-8000-000000000010',(select id from public.students where full_name='Иван Тестовый'),'comment','Student only',now()+interval '2 day');
select is((select count(*)::int from public.lead_interactions where guardian_id is not null),1,'guardian subject interaction is stored');
select is((select count(*)::int from public.lead_interactions where student_id is not null),1,'student subject interaction is stored');
select throws_ok($$insert into public.lead_interactions (organization_id,type,summary) values ('92000000-0000-4000-8000-000000000010','comment','No subject')$$,'new row for relation "lead_interactions" violates check constraint "lead_interactions_subject_required"','interaction requires a subject');
select public.crm_complete_followup('92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000040','92000000-0000-4000-8000-000000000001');
select ok((select next_action_completed_at is not null from public.lead_interactions where id='92000000-0000-4000-8000-000000000040'),'completed follow-up has completion timestamp');
select is((select count(*)::int from public.crm_followup_queue('92000000-0000-4000-8000-000000000010') where guardian_id='92000000-0000-4000-8000-000000000020'),0,'completed follow-up leaves due queue');
insert into public.lead_interactions (organization_id,guardian_id,type,summary,next_action_at) values ('92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000021','call','Never call',now()-interval '1 day');
select is((select count(*)::int from public.crm_followup_queue('92000000-0000-4000-8000-000000000010') where guardian_id='92000000-0000-4000-8000-000000000021'),0,'do-not-contact is excluded from queue');

insert into public.lead_interactions (organization_id,guardian_id,type,summary) values ('92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000022','comment','Merge me');
update public.guardians set status='active' where id='92000000-0000-4000-8000-000000000020';
update public.student_guardians set is_billing_contact=false where guardian_id='92000000-0000-4000-8000-000000000022';
select public.crm_merge_guardians('92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000020','92000000-0000-4000-8000-000000000022','92000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.lead_interactions where guardian_id='92000000-0000-4000-8000-000000000022'),0,'merge removes duplicate interaction references');
select ok((select count(*) from public.lead_interactions where guardian_id='92000000-0000-4000-8000-000000000020') >= 2,'merge retains interaction history on master');
select is((select status::text from public.students where full_name='Иван Тестовый'),'prospect','student lifecycle is independent from enrollment');
select ok((select relrowsecurity from pg_class where oid='public.lead_interactions'::regclass),'interaction table remains protected by RLS');
select ok(not has_function_privilege('authenticated','public.crm_link_student_guardian(uuid,uuid,uuid,text,boolean,boolean)','execute'),'transactional relation RPC is not browser executable');
select ok(not has_function_privilege('authenticated','public.crm_followup_queue(uuid)','execute'),'follow-up queue RPC is service-role only');
select throws_ok($$insert into public.lead_interactions(organization_id,guardian_id,type) values ('92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000090','call')$$,'interaction_guardian_wrong_organization','cross-tenant guardian interaction is rejected');
select throws_ok($$insert into public.lead_interactions(organization_id,student_id,type) values ('92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000091','call')$$,'interaction_student_wrong_organization','cross-tenant student interaction is rejected');
select throws_ok($$insert into public.lead_interactions(organization_id,lead_id,type) values ('92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000092','call')$$,'interaction_lead_wrong_organization','cross-tenant lead interaction is rejected');
select throws_ok($$update public.guardians set responsible_manager_id='92000000-0000-4000-8000-000000000001' where id='92000000-0000-4000-8000-000000000090'$$,'guardian_responsible_manager_not_active_staff','cross-tenant responsible manager is rejected');
select lives_ok($$update public.guardians set responsible_manager_id='92000000-0000-4000-8000-000000000001' where id='92000000-0000-4000-8000-000000000020'$$,'active same-tenant manager can be assigned');
select lives_ok($$select public.crm_record_interaction('92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000020',null,null,'92000000-0000-4000-8000-000000000001','call','answered','Completed and rescheduled',now()+interval '30 day','92000000-0000-4000-8000-000000000041')$$,'follow-up completion and replacement interaction are atomic');
select ok((select next_action_completed_at is not null from public.lead_interactions where id='92000000-0000-4000-8000-000000000041'),'atomic follow-up action completes the original interaction');

insert into public.guardians(id,organization_id,full_name,phone,status) values ('92000000-0000-4000-8000-000000000023','92000000-0000-4000-8000-000000000010','Existing guardian','+7 999 000-00-01','prospect');
insert into public.leads(id,organization_id,parent_name,parent_phone,parent_email,child_name,status) values ('92000000-0000-4000-8000-000000000031','92000000-0000-4000-8000-000000000010','Lead snapshot','89990000001','lead@example.test','Child from lead','contacted');
insert into public.lead_interactions(organization_id,lead_id,type,summary) values ('92000000-0000-4000-8000-000000000010','92000000-0000-4000-8000-000000000031','call','Before conversion');
select public.convert_lead_to_student('92000000-0000-4000-8000-000000000031',null);
select is((select converted_guardian_id from public.leads where id='92000000-0000-4000-8000-000000000031'),'92000000-0000-4000-8000-000000000023'::uuid,'lead conversion reuses normalized guardian');
select ok((select guardian_id is not null and student_id is not null from public.lead_interactions where lead_id='92000000-0000-4000-8000-000000000031'),'legacy lead interaction is linked to resulting people');
select is((select count(*)::int from auth.users),1,'lead conversion does not create an Auth identity');

select * from finish();
rollback;
