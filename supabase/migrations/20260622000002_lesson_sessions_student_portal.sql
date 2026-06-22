-- Migration to add student_users link table and update lesson_sessions schema

-- 1. Alter type public.lesson_session_status to add 'live' value
alter type public.lesson_session_status add value if not exists 'live';

-- 2. Add columns and unique constraint to public.lesson_sessions
alter table public.lesson_sessions 
add column if not exists materials_unlocked boolean not null default false,
add column if not exists started_at timestamptz,
add column if not exists lesson_date date not null default current_date;

alter table public.lesson_sessions drop constraint if exists lesson_sessions_group_id_lesson_date_key;
alter table public.lesson_sessions add constraint lesson_sessions_group_id_lesson_date_key unique (group_id, lesson_date);

-- 3. Create public.student_users link table
create table if not exists public.student_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (organization_id, student_id, user_id)
);

-- Enable RLS
alter table public.student_users enable row level security;

-- Add RLS Policies
drop policy if exists "student_users_select" on public.student_users;
drop policy if exists "student_users_all" on public.student_users;

create policy "student_users_select" on public.student_users
  for select to authenticated using (
    public.is_org_member(organization_id) or user_id = auth.uid()
  );

create policy "student_users_all" on public.student_users
  for all to authenticated using (
    public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[])
  );
