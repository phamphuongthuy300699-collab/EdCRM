-- Migration: Simple Site Editor
-- Path: supabase/migrations/20260629000001_simple_site_editor.sql

-- 1. Create site_block_status enum if not exists
do $$
begin
  if not exists (select 1 from pg_type where typname = 'site_block_status') then
    create type public.site_block_status as enum (
      'draft',
      'published',
      'hidden'
    );
  end if;
end
$$;

-- 2. Create site_content_blocks table
create table if not exists public.site_content_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  page_slug text not null default '/',
  block_key text not null,
  title text,
  subtitle text,
  content jsonb not null default '{}'::jsonb,
  image_url text,
  image_alt text,
  sort_order int not null default 100,
  status public.site_block_status not null default 'published',
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, page_slug, block_key)
);

-- 3. Enable RLS
alter table public.site_content_blocks enable row level security;

-- 4. Create RLS Policies for site_content_blocks
drop policy if exists "site_content_blocks_select_public" on public.site_content_blocks;
create policy "site_content_blocks_select_public"
on public.site_content_blocks
for select
using (status = 'published');

drop policy if exists "site_content_blocks_admin_all" on public.site_content_blocks;
create policy "site_content_blocks_admin_all"
on public.site_content_blocks
for all
to authenticated
using (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
with check (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- 5. Add show_on_site column to groups
alter table public.groups
add column if not exists show_on_site boolean not null default true;

-- 6. RLS Policies for public access to courses, groups, and schedule rules
drop policy if exists "courses_select_public" on public.courses;
create policy "courses_select_public"
on public.courses
for select
using (is_public = true);

drop policy if exists "groups_select_public" on public.groups;
create policy "groups_select_public"
on public.groups
for select
using (show_on_site = true);

drop policy if exists "group_schedule_rules_select_public" on public.group_schedule_rules;
create policy "group_schedule_rules_select_public"
on public.group_schedule_rules
for select
using (exists (
  select 1 from public.groups g
  where g.id = group_id
    and g.show_on_site = true
));

-- 7. Seed initial blocks for default organization 'robotics-lipetsk'
do $$
declare
  org_id uuid;
begin
  select id into org_id from public.organizations where slug = 'robotics-lipetsk' limit 1;
  if org_id is not null then
    -- Seed home.hero
    insert into public.site_content_blocks (organization_id, page_slug, block_key, title, subtitle, content)
    values (
      org_id, '/', 'home.hero',
      'Бесплатное пробное занятие 90 минут: ребенок соберет и запрограммирует первого робота',
      'Курсы робототехники и программирования для детей 6–14 лет в Липецке. Практика на реальном оборудовании в мини-группах.',
      '{"badge": "Школа робототехники в Липецке", "ctaText": "Записаться на пробный урок", "secondaryCtaText": "Посмотреть проекты", "bullets": ["Без предоплаты", "Оборудование включено", "Мини-группы до 8 детей", "Подберем группу по возрасту"]}'::jsonb
    ) on conflict (organization_id, page_slug, block_key) do nothing;

    -- Seed home.teachers
    insert into public.site_content_blocks (organization_id, page_slug, block_key, title, subtitle, content)
    values (
      org_id, '/', 'home.teachers',
      'Наши преподаватели',
      'Практикующие наставники, которые умеют объяснять сложное детям простым языком',
      '{
        "items": [
          {
            "name": "Алексей Дмитриев",
            "role": "Старший наставник LEGO & Arduino",
            "text": "Помогает детям не бояться ошибок и доводить инженерные проекты до рабочего результата.",
            "imageUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
            "alt": "Алексей Дмитриев — преподаватель робототехники"
          },
          {
            "name": "Мария Соколова",
            "role": "Преподаватель Scratch и основ программирования",
            "text": "Учит мыслить алгоритмами через игры, мультфильмы и первые интерактивные проекты.",
            "imageUrl": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
            "alt": "Мария Соколова — преподаватель программирования"
          },
          {
            "name": "Егор Смирнов",
            "role": "Python / Arduino наставник",
            "text": "Объясняет Python, электронику и датчики через практические задачи и мини-проекты.",
            "imageUrl": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
            "alt": "Егор Смирнов — наставник Python/Arduino"
          }
        ]
      }'::jsonb
    ) on conflict (organization_id, page_slug, block_key) do nothing;

    -- Seed home.parent_student_portal_preview
    insert into public.site_content_blocks (organization_id, page_slug, block_key, title, subtitle, content)
    values (
      org_id, '/', 'home.parent_student_portal_preview',
      'Родители видят прогресс ребенка в личном кабинете',
      'Расписание, посещаемость, баланс, материалы урока и отчеты наставника — в одном месте.',
      '{
        "studentName": "Миша Иванов",
        "age": "8 лет",
        "course": "Робототехника LEGO",
        "nextLesson": "Суббота, 12:00",
        "cabinet": "Кабинет 3",
        "attendance": "7 из 8",
        "project": "Робот RoboSort-3000",
        "balance": "Осталось 2 занятия",
        "teacherNote": "Миша отлично справился с логикой ветвления и доработал алгоритм захвата кубиков."
      }'::jsonb
    ) on conflict (organization_id, page_slug, block_key) do nothing;

    -- Seed home.seo
    insert into public.site_content_blocks (organization_id, page_slug, block_key, title, subtitle, content)
    values (
      org_id, '/', 'home.seo',
      'Робототехника и программирование для детей в Липецке | Школа Robotics',
      'Курсы робототехники, Scratch, Python и Arduino для детей 6–14 лет в Липецке. Бесплатное пробное занятие 90 минут! Запись в мини-группы до 8 человек.',
      '{"h1": "Бесплатное пробное занятие 90 минут: ребенок соберет и запрограммирует первого робота"}'::jsonb
    ) on conflict (organization_id, page_slug, block_key) do nothing;

    -- Seed home.prices
    insert into public.site_content_blocks (organization_id, page_slug, block_key, title, subtitle, content)
    values (
      org_id, '/', 'home.prices',
      'Стоимость обучения',
      'Прозрачные тарифы без скрытых переплат и комиссий',
      '{
        "trialPrice": "0 ₽",
        "monthlyPrice": "от 4 000 ₽",
        "individualPrice": "от 1 500 ₽"
      }'::jsonb
    ) on conflict (organization_id, page_slug, block_key) do nothing;
  end if;
end
$$;
