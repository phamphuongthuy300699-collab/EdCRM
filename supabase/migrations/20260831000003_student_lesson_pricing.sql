-- Move lesson debit pricing from groups to individual students.
-- The legacy groups.lesson_price column is intentionally retained for rolling
-- compatibility, but no new debit reads it after this migration.

alter table public.students
  add column if not exists lesson_price numeric(12,2);

-- Preserve a legacy price only when every priced active enrollment for the
-- student agrees. Ambiguous or absent prices remain NULL for an administrator
-- to set explicitly; no business value is invented during deployment.
with unambiguous_prices as (
  select
    student.id as student_id,
    min(group_row.lesson_price) as lesson_price
  from public.students student
  join public.enrollments enrollment
    on enrollment.organization_id = student.organization_id
   and enrollment.student_id = student.id
   and enrollment.status = 'active'
  join public.groups group_row
    on group_row.organization_id = enrollment.organization_id
   and group_row.id = enrollment.group_id
  where group_row.lesson_price > 0
  group by student.id
  having count(distinct group_row.lesson_price) = 1
)
update public.students student
set lesson_price = unambiguous_prices.lesson_price
from unambiguous_prices
where student.id = unambiguous_prices.student_id
  and student.lesson_price is null;

alter table public.students
  drop constraint if exists students_lesson_price_positive;
alter table public.students
  add constraint students_lesson_price_positive
  check (lesson_price is null or lesson_price > 0);

-- Old warnings described one group price for the whole session. Resolve those
-- deprecated records; new warnings below are scoped to session + student.
update public.finance_warnings
set resolved_at = coalesce(resolved_at, now())
where warning_type = 'missing_lesson_price'
  and warning_key not like 'lesson-price:%:%'
  and resolved_at is null;

create or replace function public.crm_create_student_with_guardians(
  p_organization_id uuid,
  p_student jsonb,
  p_guardians jsonb default '[]'::jsonb,
  p_group_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_lesson_price numeric(12,2);
  item jsonb;
  v_guardian_id uuid;
  v_link jsonb;
  links jsonb := '[]';
  primary_count int;
  billing_count int;
begin
  if p_organization_id is null then raise exception 'organization_required'; end if;
  if nullif(trim(p_student->>'full_name'),'') is null then raise exception 'student_name_required'; end if;
  if jsonb_typeof(coalesce(p_guardians,'[]')) <> 'array' then raise exception 'guardians_must_be_array'; end if;

  v_lesson_price := nullif(p_student->>'lesson_price', '')::numeric;
  if v_lesson_price is null or v_lesson_price <= 0 then
    raise exception 'student_lesson_price_required';
  end if;

  select count(*) into primary_count
  from jsonb_array_elements(coalesce(p_guardians,'[]')) x
  where coalesce((x->>'is_primary')::boolean,false);
  select count(*) into billing_count
  from jsonb_array_elements(coalesce(p_guardians,'[]')) x
  where coalesce((x->>'is_billing_contact')::boolean,false);
  if primary_count > 1 then raise exception 'maximum_one_primary'; end if;
  if billing_count > 1 then raise exception 'maximum_one_billing_contact'; end if;

  if p_group_id is not null and not exists (
    select 1 from public.groups
    where id = p_group_id
      and organization_id = p_organization_id
      and status = 'active'
      and deleted_at is null
  ) then
    raise exception 'group_not_found_or_inactive';
  end if;

  insert into public.students (
    organization_id, full_name, birth_date, status, notes, lesson_price
  ) values (
    p_organization_id,
    trim(p_student->>'full_name'),
    nullif(p_student->>'birth_date','')::date,
    coalesce(nullif(p_student->>'status',''),'prospect'),
    nullif(p_student->>'notes',''),
    v_lesson_price
  ) returning id into v_student_id;

  for item in select value from jsonb_array_elements(coalesce(p_guardians,'[]')) loop
    v_guardian_id := nullif(item->>'guardian_id','')::uuid;
    if v_guardian_id is null then
      if nullif(trim(item->>'full_name'),'') is null then raise exception 'guardian_name_required'; end if;
      insert into public.guardians (organization_id, full_name, phone, email, status)
      values (
        p_organization_id,
        trim(item->>'full_name'),
        nullif(item->>'phone',''),
        nullif(item->>'email',''),
        'prospect'
      ) returning id into v_guardian_id;
    end if;
    v_link := public.crm_link_student_guardian(
      p_organization_id,
      v_student_id,
      v_guardian_id,
      coalesce(nullif(item->>'relation',''),'Родитель'),
      coalesce((item->>'is_primary')::boolean,false),
      coalesce((item->>'is_billing_contact')::boolean,false)
    );
    links := links || jsonb_build_object(
      'guardian_id', v_guardian_id,
      'student_guardian_id', v_link->>'student_guardian_id'
    );
  end loop;

  if p_group_id is not null then
    insert into public.enrollments (organization_id, student_id, group_id, status, started_on)
    values (p_organization_id, v_student_id, p_group_id, 'active', current_date);
  end if;
  return jsonb_build_object('student_id',v_student_id,'guardians',links);
end;
$$;

revoke all on function public.crm_create_student_with_guardians(uuid,jsonb,jsonb,uuid)
  from public, anon, authenticated;
grant execute on function public.crm_create_student_with_guardians(uuid,jsonb,jsonb,uuid)
  to service_role;

create or replace function public.convert_lead_to_student(
  p_lead_id uuid,
  p_group_id uuid,
  p_lesson_price numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_guardian_id uuid;
  v_student_id uuid;
  v_enrollment_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_lead_id::text));
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then raise exception 'lead_not_found'; end if;

  if v_lead.status = 'converted'
     and v_lead.converted_guardian_id is not null
     and v_lead.converted_student_id is not null then
    return jsonb_build_object(
      'ok', true,
      'alreadyConverted', true,
      'guardianId', v_lead.converted_guardian_id,
      'studentId', v_lead.converted_student_id
    );
  end if;

  if p_lesson_price is null or p_lesson_price <= 0 then
    raise exception 'student_lesson_price_required';
  end if;

  select id into v_guardian_id
  from public.guardians
  where organization_id = v_lead.organization_id
    and deleted_at is null
    and anonymized_at is null
    and merged_into_guardian_id is null
    and status <> 'archived'
    and (
      (phone_normalized is not null and phone_normalized = public.normalize_ru_phone(v_lead.parent_phone))
      or (email_normalized is not null and email_normalized = nullif(lower(trim(v_lead.parent_email)),''))
    )
  order by created_at
  limit 1
  for update;

  if v_guardian_id is null then
    insert into public.guardians (
      organization_id, full_name, phone, email, status, source, interest_notes, notes
    ) values (
      v_lead.organization_id, v_lead.parent_name, v_lead.parent_phone,
      v_lead.parent_email, 'prospect', v_lead.source, v_lead.message,
      'Создан из заявки ' || v_lead.id
    ) returning id into v_guardian_id;
  end if;

  insert into public.students (organization_id, full_name, status, notes, lesson_price)
  values (
    v_lead.organization_id,
    coalesce(nullif(v_lead.child_name,''),v_lead.parent_name || ' — ребёнок'),
    'prospect',
    'Создан из заявки ' || v_lead.id,
    p_lesson_price
  ) returning id into v_student_id;

  perform public.crm_link_student_guardian(
    v_lead.organization_id, v_student_id, v_guardian_id, 'Родитель', true, true
  );
  if p_group_id is not null then
    insert into public.enrollments (organization_id, student_id, group_id, status, started_on)
    values (v_lead.organization_id, v_student_id, p_group_id, 'active', current_date)
    returning id into v_enrollment_id;
  end if;

  update public.leads
  set status = 'converted',
      converted_guardian_id = v_guardian_id,
      converted_student_id = v_student_id,
      guardian_id = v_guardian_id,
      student_id = v_student_id,
      updated_at = now()
  where id = p_lead_id;
  update public.lead_interactions
  set guardian_id = v_guardian_id, student_id = v_student_id
  where organization_id = v_lead.organization_id and lead_id = p_lead_id;

  return jsonb_build_object(
    'ok', true,
    'alreadyConverted', false,
    'guardianId', v_guardian_id,
    'studentId', v_student_id,
    'enrollmentId', v_enrollment_id
  );
end;
$$;

-- Compatibility entry point: an already converted lead remains idempotent,
-- while old callers cannot create a new student without an explicit price.
create or replace function public.convert_lead_to_student(
  p_lead_id uuid,
  p_group_id uuid default null
) returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.convert_lead_to_student(p_lead_id, p_group_id, null::numeric);
$$;

revoke all on function public.convert_lead_to_student(uuid,uuid,numeric)
  from public, anon, authenticated;
revoke all on function public.convert_lead_to_student(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.convert_lead_to_student(uuid,uuid,numeric)
  to service_role;
grant execute on function public.convert_lead_to_student(uuid,uuid)
  to service_role;

create or replace function public.reconcile_lesson_finance(
  p_organization_id uuid,
  p_lesson_session_id uuid,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.lesson_sessions%rowtype;
  target_group public.groups%rowtype;
  student_row public.students%rowtype;
  attendance_row record;
  billing_guardian uuid;
  target_account public.billing_accounts%rowtype;
  saved_entry uuid;
  source_attendance_id uuid;
  is_makeup boolean;
  should_charge boolean;
  created_debits integer := 0;
  active_warnings integer := 0;
begin
  select * into target_session
  from public.lesson_sessions
  where id = p_lesson_session_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'session_not_found'; end if;
  if target_session.status <> 'completed' then raise exception 'session_not_completed'; end if;

  select * into target_group
  from public.groups
  where id = target_session.group_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'group_not_found'; end if;

  if not target_group.billing_enabled or target_session.session_kind = 'trial' then
    update public.finance_warnings
    set resolved_at = coalesce(resolved_at, now())
    where organization_id = p_organization_id
      and lesson_session_id = target_session.id
      and warning_type in ('missing_lesson_price', 'missing_billing_contact')
      and resolved_at is null;
    return jsonb_build_object(
      'lessonSessionId', target_session.id,
      'createdDebits', 0,
      'activeWarnings', 0,
      'unchanged', true
    );
  end if;

  for attendance_row in
    select * from public.attendance
    where organization_id = p_organization_id
      and lesson_session_id = target_session.id
  loop
    source_attendance_id := null;
    billing_guardian := null;
    saved_entry := null;

    select makeup.source_attendance_id into source_attendance_id
    from public.makeup_assignments makeup
    where makeup.organization_id = p_organization_id
      and makeup.target_session_id = target_session.id
      and makeup.student_id = attendance_row.student_id
      and makeup.status in ('scheduled', 'completed')
    order by makeup.created_at desc
    limit 1;

    is_makeup := source_attendance_id is not null;
    should_charge := false;
    if is_makeup then
      should_charge := attendance_row.attendance_status in ('present', 'late')
        and not exists (
          select 1
          from public.billing_ledger_entries ledger
          join public.attendance source_attendance
            on source_attendance.lesson_session_id = ledger.lesson_session_id
           and source_attendance.student_id = ledger.student_id
          where ledger.organization_id = p_organization_id
            and ledger.entry_type = 'lesson_debit'
            and source_attendance.id = source_attendance_id
        );
    else
      should_charge := attendance_row.attendance_status in ('present', 'late')
        or (attendance_row.attendance_status = 'absent_excused' and target_group.charge_absent_excused)
        or (attendance_row.attendance_status = 'absent_unexcused' and target_group.charge_absent_unexcused);
    end if;

    if not should_charge then
      update public.finance_warnings
      set resolved_at = coalesce(resolved_at, now())
      where organization_id = p_organization_id
        and warning_key in (
          'lesson-price:' || target_session.id || ':' || attendance_row.student_id,
          'billing-contact:' || target_session.id || ':' || attendance_row.student_id
        )
        and resolved_at is null;
      continue;
    end if;

    select * into student_row
    from public.students
    where organization_id = p_organization_id and id = attendance_row.student_id
    for share;
    if not found then raise exception 'student_not_found'; end if;

    if student_row.lesson_price is null or student_row.lesson_price <= 0 then
      insert into public.finance_warnings (
        organization_id, warning_key, warning_type, lesson_session_id, student_id, details
      ) values (
        p_organization_id,
        'lesson-price:' || target_session.id || ':' || attendance_row.student_id,
        'missing_lesson_price',
        target_session.id,
        attendance_row.student_id,
        jsonb_build_object('groupId', target_group.id, 'studentId', attendance_row.student_id)
      )
      on conflict (organization_id, warning_key) do update
        set resolved_at = null, student_id = excluded.student_id, details = excluded.details;
      active_warnings := active_warnings + 1;
      continue;
    end if;

    update public.finance_warnings
    set resolved_at = coalesce(resolved_at, now())
    where organization_id = p_organization_id
      and warning_key = 'lesson-price:' || target_session.id || ':' || attendance_row.student_id
      and resolved_at is null;

    select link.guardian_id into billing_guardian
    from public.student_guardians link
    where link.organization_id = p_organization_id
      and link.student_id = attendance_row.student_id
      and link.is_billing_contact = true
    limit 1;

    if billing_guardian is null then
      insert into public.finance_warnings (
        organization_id, warning_key, warning_type, lesson_session_id, student_id, details
      ) values (
        p_organization_id,
        'billing-contact:' || target_session.id || ':' || attendance_row.student_id,
        'missing_billing_contact',
        target_session.id,
        attendance_row.student_id,
        jsonb_build_object('groupId', target_group.id)
      )
      on conflict (organization_id, warning_key) do update
        set resolved_at = null, details = excluded.details;
      active_warnings := active_warnings + 1;
      continue;
    end if;

    insert into public.billing_accounts (organization_id, guardian_id)
    values (p_organization_id, billing_guardian)
    on conflict (organization_id, guardian_id) do nothing;
    select * into target_account
    from public.billing_accounts
    where organization_id = p_organization_id and guardian_id = billing_guardian
    for update;

    insert into public.billing_ledger_entries (
      organization_id, account_id, guardian_id, student_id, entry_type, amount,
      lesson_session_id, attendance_id, reason, created_by
    ) values (
      p_organization_id, target_account.id, billing_guardian, attendance_row.student_id,
      'lesson_debit', -student_row.lesson_price, target_session.id, attendance_row.id,
      'Занятие ' || target_session.lesson_date::text, p_actor_id
    )
    on conflict (organization_id, lesson_session_id, student_id)
      where lesson_session_id is not null and student_id is not null and entry_type = 'lesson_debit'
      do nothing
    returning id into saved_entry;

    if saved_entry is not null then
      update public.billing_accounts
      set balance = balance - student_row.lesson_price, updated_at = now()
      where id = target_account.id;
      created_debits := created_debits + 1;
    end if;

    if saved_entry is not null or exists (
      select 1 from public.billing_ledger_entries
      where organization_id = p_organization_id
        and lesson_session_id = target_session.id
        and student_id = attendance_row.student_id
        and entry_type = 'lesson_debit'
    ) then
      update public.finance_warnings
      set resolved_at = coalesce(resolved_at, now())
      where organization_id = p_organization_id
        and warning_key in (
          'lesson-price:' || target_session.id || ':' || attendance_row.student_id,
          'billing-contact:' || target_session.id || ':' || attendance_row.student_id
        )
        and resolved_at is null;
    end if;
  end loop;

  select count(*) into active_warnings
  from public.finance_warnings
  where organization_id = p_organization_id
    and lesson_session_id = target_session.id
    and warning_type in ('missing_lesson_price', 'missing_billing_contact')
    and resolved_at is null;

  return jsonb_build_object(
    'lessonSessionId', target_session.id,
    'createdDebits', created_debits,
    'activeWarnings', active_warnings,
    'unchanged', created_debits = 0
  );
end;
$$;

revoke all on function public.reconcile_lesson_finance(uuid,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.reconcile_lesson_finance(uuid,uuid,uuid)
  to service_role;

-- Preserve the existing lesson lifecycle and payroll boundary; only the debit
-- amount and price-warning scope change from group to student.
create or replace function public.transition_lesson_session(
  p_organization_id uuid,
  p_session_id uuid,
  p_actor_id uuid,
  p_action text,
  p_is_admin boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.lesson_sessions%rowtype;
  target_group public.groups%rowtype;
  student_row public.students%rowtype;
  attendance_row record;
  billing_guardian uuid;
  target_account public.billing_accounts%rowtype;
  saved_entry uuid;
  should_charge boolean;
  is_makeup boolean;
  source_attendance_id uuid;
  debit_count integer := 0;
  warning_count integer := 0;
  attendee_count integer := 0;
  teacher_rate numeric(12,2);
begin
  select * into target_session from public.lesson_sessions
  where id = p_session_id and organization_id = p_organization_id
  for update;
  if not found then raise exception 'session_not_found'; end if;
  if not p_is_admin and (
    target_session.teacher_id is null or target_session.teacher_id <> p_actor_id
  ) then raise exception 'foreign_teacher_session'; end if;

  if p_action = 'start' then
    if target_session.status = 'live' then
      return jsonb_build_object('id',target_session.id,'status',target_session.status,'unchanged',true);
    end if;
    if target_session.status <> 'planned' then raise exception 'session_cannot_start'; end if;
    update public.lesson_sessions
    set status = 'live', started_at = coalesce(started_at,now()), materials_unlocked = true
    where id = target_session.id;
    return jsonb_build_object('id',target_session.id,'status','live');
  end if;

  if p_action = 'complete' then
    if target_session.status = 'completed' then
      return jsonb_build_object('id',target_session.id,'status',target_session.status,'unchanged',true);
    end if;
    if target_session.status <> 'live' then raise exception 'session_must_be_live'; end if;
    select * into target_group from public.groups
    where id = target_session.group_id and organization_id = p_organization_id
    for update;
    if not found then raise exception 'group_not_found'; end if;

    if exists (
      with expected_students as (
        select student_id from public.enrollments
        where organization_id = p_organization_id
          and group_id = target_session.group_id
          and status = 'active'
        union
        select student_id from public.makeup_assignments
        where organization_id = p_organization_id
          and target_session_id = target_session.id
          and status = 'scheduled'
      )
      select 1 from expected_students expected
      left join public.attendance attendance_mark
        on attendance_mark.lesson_session_id = target_session.id
       and attendance_mark.student_id = expected.student_id
      where attendance_mark.id is null or attendance_mark.attendance_status = 'unmarked'
    ) then raise exception 'attendance_incomplete'; end if;

    update public.makeup_assignments makeup
    set status = 'completed',
        completed_at = coalesce(makeup.completed_at,now()),
        updated_at = now()
    where makeup.organization_id = p_organization_id
      and makeup.target_session_id = target_session.id
      and makeup.status = 'scheduled'
      and exists (
        select 1 from public.attendance attendance_mark
        where attendance_mark.lesson_session_id = target_session.id
          and attendance_mark.student_id = makeup.student_id
          and attendance_mark.attendance_status in ('present', 'late')
      );

    select count(*) into attendee_count
    from public.attendance
    where organization_id = p_organization_id
      and lesson_session_id = target_session.id
      and attendance_status in ('present', 'late');

    if target_group.billing_enabled and target_session.session_kind <> 'trial' then
      for attendance_row in
        select * from public.attendance
        where organization_id = p_organization_id
          and lesson_session_id = target_session.id
      loop
        source_attendance_id := null;
        select makeup.source_attendance_id into source_attendance_id
        from public.makeup_assignments makeup
        where makeup.organization_id = p_organization_id
          and makeup.target_session_id = target_session.id
          and makeup.student_id = attendance_row.student_id
          and makeup.status in ('scheduled','completed')
        order by makeup.created_at desc
        limit 1;
        is_makeup := source_attendance_id is not null;
        should_charge := false;
        if is_makeup then
          should_charge := attendance_row.attendance_status in ('present','late')
            and not exists (
              select 1
              from public.billing_ledger_entries ledger
              join public.attendance source_attendance
                on source_attendance.lesson_session_id = ledger.lesson_session_id
               and source_attendance.student_id = ledger.student_id
              where ledger.organization_id = p_organization_id
                and ledger.entry_type = 'lesson_debit'
                and source_attendance.id = source_attendance_id
            );
        else
          should_charge := attendance_row.attendance_status in ('present','late')
            or (attendance_row.attendance_status = 'absent_excused' and target_group.charge_absent_excused)
            or (attendance_row.attendance_status = 'absent_unexcused' and target_group.charge_absent_unexcused);
        end if;

        if should_charge then
          select * into student_row
          from public.students
          where organization_id = p_organization_id and id = attendance_row.student_id
          for share;
          if not found then raise exception 'student_not_found'; end if;

          if student_row.lesson_price is null or student_row.lesson_price <= 0 then
            insert into public.finance_warnings (
              organization_id, warning_key, warning_type, lesson_session_id, student_id, details
            ) values (
              p_organization_id,
              'lesson-price:' || target_session.id || ':' || attendance_row.student_id,
              'missing_lesson_price', target_session.id, attendance_row.student_id,
              jsonb_build_object('groupId', target_group.id, 'studentId', attendance_row.student_id)
            )
            on conflict (organization_id,warning_key) do update
              set resolved_at = null, student_id = excluded.student_id, details = excluded.details;
            warning_count := warning_count + 1;
            continue;
          end if;

          update public.finance_warnings
          set resolved_at = coalesce(resolved_at, now())
          where organization_id = p_organization_id
            and warning_key = 'lesson-price:' || target_session.id || ':' || attendance_row.student_id
            and resolved_at is null;

          select link.guardian_id into billing_guardian
          from public.student_guardians link
          where link.organization_id = p_organization_id
            and link.student_id = attendance_row.student_id
            and link.is_billing_contact = true
          limit 1;
          if billing_guardian is null then
            insert into public.finance_warnings (
              organization_id, warning_key, warning_type, lesson_session_id, student_id, details
            ) values (
              p_organization_id,
              'billing-contact:' || target_session.id || ':' || attendance_row.student_id,
              'missing_billing_contact', target_session.id, attendance_row.student_id,
              jsonb_build_object('groupId',target_group.id)
            )
            on conflict (organization_id,warning_key) do update
              set resolved_at = null, details = excluded.details;
            warning_count := warning_count + 1;
          else
            insert into public.billing_accounts (organization_id,guardian_id)
            values (p_organization_id,billing_guardian)
            on conflict (organization_id,guardian_id) do nothing;
            select * into target_account
            from public.billing_accounts
            where organization_id = p_organization_id and guardian_id = billing_guardian
            for update;
            saved_entry := null;
            insert into public.billing_ledger_entries (
              organization_id, account_id, guardian_id, student_id, entry_type, amount,
              lesson_session_id, attendance_id, reason
            ) values (
              p_organization_id, target_account.id, billing_guardian, attendance_row.student_id,
              'lesson_debit', -student_row.lesson_price, target_session.id, attendance_row.id,
              'Занятие ' || target_session.lesson_date::text
            )
            on conflict (organization_id, lesson_session_id, student_id)
              where lesson_session_id is not null
                and student_id is not null
                and entry_type = 'lesson_debit'
              do nothing
            returning id into saved_entry;
            if saved_entry is not null then
              update public.billing_accounts
              set balance = balance - student_row.lesson_price, updated_at = now()
              where id = target_account.id;
              debit_count := debit_count + 1;
            end if;
          end if;
        end if;
      end loop;
    end if;

    if target_session.teacher_id is not null then
      select rate_per_attendee into teacher_rate
      from public.teacher_pay_rules
      where organization_id = p_organization_id
        and teacher_id = target_session.teacher_id
        and effective_from <= target_session.lesson_date
      order by effective_from desc
      limit 1;
      if teacher_rate is null then
        teacher_rate := 0;
        insert into public.finance_warnings (
          organization_id, warning_key, warning_type, lesson_session_id, teacher_id, details
        ) values (
          p_organization_id, 'teacher-rate:' || target_session.id,
          'missing_teacher_rate', target_session.id, target_session.teacher_id,
          jsonb_build_object('lessonDate',target_session.lesson_date)
        )
        on conflict (organization_id,warning_key) do update
          set resolved_at = null, details = excluded.details;
        warning_count := warning_count + 1;
      end if;
      insert into public.teacher_payroll_entries (
        organization_id, lesson_session_id, teacher_id, attendee_count, rate_snapshot, amount
      ) values (
        p_organization_id, target_session.id, target_session.teacher_id,
        attendee_count, teacher_rate, attendee_count * teacher_rate
      )
      on conflict (organization_id, lesson_session_id, teacher_id) do nothing;
    end if;

    update public.lesson_sessions
    set status = 'completed', completed_at = coalesce(completed_at,now())
    where id = target_session.id;
    return jsonb_build_object(
      'id',target_session.id,
      'status','completed',
      'lessonDebits',debit_count,
      'attendees',attendee_count,
      'warnings',warning_count
    );
  end if;
  raise exception 'unsupported_session_action';
end;
$$;

revoke all on function public.transition_lesson_session(uuid,uuid,uuid,text,boolean)
  from public, anon, authenticated;
grant execute on function public.transition_lesson_session(uuid,uuid,uuid,text,boolean)
  to service_role;
