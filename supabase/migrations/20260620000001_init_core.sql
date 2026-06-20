create extension if not exists pgcrypto;

create type public.app_role as enum (
  'owner',
  'admin',
  'manager',
  'teacher',
  'accountant'
);

create type public.lead_status as enum (
  'new',
  'contacted',
  'trial_scheduled',
  'converted',
  'lost'
);

create type public.student_status as enum (
  'active',
  'paused',
  'archived'
);

create type public.group_status as enum (
  'draft',
  'active',
  'paused',
  'closed'
);

create type public.enrollment_status as enum (
  'active',
  'paused',
  'completed',
  'cancelled'
);

create type public.invoice_status as enum (
  'draft',
  'issued',
  'paid',
  'partially_paid',
  'overdue',
  'cancelled'
);

create type public.payment_status as enum (
  'pending',
  'succeeded',
  'failed',
  'refunded',
  'cancelled'
);

create type public.payment_provider as enum (
  'cash',
  'bank_transfer',
  'yookassa',
  'robokassa'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text not null default 'Липецк',
  timezone text not null default 'Europe/Moscow',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.org_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  name text not null,
  capacity int,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  slug text not null,
  short_description text,
  full_description text,
  min_age int,
  max_age int,
  duration_minutes int not null default 90,
  price_monthly numeric(12,2),
  is_public boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete restrict,
  branch_id uuid references public.branches(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  teacher_id uuid references public.profiles(id) on delete set null,
  title text not null,
  status public.group_status not null default 'draft',
  age_from int,
  age_to int,
  capacity int not null default 8,
  starts_on date,
  ends_on date,
  price_monthly numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_schedule_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  weekday int not null check (weekday between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  birth_date date,
  status public.student_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  telegram_username text,
  max_contact text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  relation text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_id, guardian_id)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete restrict,
  status public.enrollment_status not null default 'active',
  started_on date not null default current_date,
  ended_on date,
  created_at timestamptz not null default now(),
  unique (student_id, group_id, status)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status public.lead_status not null default 'new',
  source text not null default 'site_form',

  parent_name text not null,
  parent_phone text not null,
  parent_email text,
  child_name text,
  child_age int,
  course_id uuid references public.courses(id) on delete set null,
  message text,

  assigned_to uuid references public.profiles(id) on delete set null,
  converted_student_id uuid references public.students(id) on delete set null,
  converted_guardian_id uuid references public.guardians(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  guardian_id uuid references public.guardians(id) on delete set null,
  enrollment_id uuid references public.enrollments(id) on delete set null,

  status public.invoice_status not null default 'draft',
  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'RUB',
  due_date date,
  issued_at timestamptz,
  paid_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  guardian_id uuid references public.guardians(id) on delete set null,

  provider public.payment_provider not null,
  status public.payment_status not null default 'pending',
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'RUB',

  provider_payment_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete cascade,
  provider public.payment_provider not null,
  event_type text not null,
  external_id text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  lesson_date date not null,
  is_present boolean not null default false,
  comment text,
  created_at timestamptz not null default now(),
  unique (group_id, student_id, lesson_date)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- Indexes

create index idx_org_memberships_user_id
  on public.org_memberships(user_id);

create index idx_courses_org_public
  on public.courses(organization_id, is_public);

create index idx_groups_org_status
  on public.groups(organization_id, status);

create index idx_students_org_status
  on public.students(organization_id, status);

create index idx_guardians_org_phone
  on public.guardians(organization_id, phone);

create index idx_leads_org_status_created
  on public.leads(organization_id, status, created_at desc);

create index idx_invoices_org_status_due
  on public.invoices(organization_id, status, due_date);

create index idx_payments_org_status_created
  on public.payments(organization_id, status, created_at desc);

create index idx_attendance_group_date
  on public.attendance(group_id, lesson_date);
