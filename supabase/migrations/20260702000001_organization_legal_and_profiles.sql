-- Migration: Organization Legal Details, Profiles Contacts, and Course Tariffs
-- Path: supabase/migrations/20260702000001_organization_legal_and_profiles.sql

-- 1. Add legal/bank fields to public.organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS short_legal_name text,
ADD COLUMN IF NOT EXISTS full_legal_name text,
ADD COLUMN IF NOT EXISTS legal_address text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_inn text,
ADD COLUMN IF NOT EXISTS bik text,
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS correspondent_account text,
ADD COLUMN IF NOT EXISTS bank_address text;

-- 2. Add show_public_contacts field to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_public_contacts boolean not null default false;

-- 3. Create course_tariffs table
CREATE TABLE IF NOT EXISTS public.course_tariffs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  audience text check (audience in ('preschool', 'school', 'general')),
  format text,
  lessons_per_month integer,
  visits_per_week integer,
  price numeric not null default 0,
  is_one_time boolean not null default false,
  sort_order integer not null default 100,
  show_on_site boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. Enable RLS on course_tariffs
ALTER TABLE public.course_tariffs enable row level security;

-- 5. Create RLS Policies for course_tariffs
DROP POLICY IF EXISTS "course_tariffs_select_public" on public.course_tariffs;
CREATE POLICY "course_tariffs_select_public"
ON public.course_tariffs
FOR SELECT
USING (show_on_site = true);

DROP POLICY IF EXISTS "course_tariffs_admin_all" on public.course_tariffs;
CREATE POLICY "course_tariffs_admin_all"
ON public.course_tariffs
FOR ALL
TO authenticated
USING (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]))
WITH CHECK (public.has_org_role(organization_id, array['owner','admin','manager']::public.app_role[]));

-- 6. Update Default Organization 'robotics-lipetsk'
UPDATE public.organizations
SET 
  phone = '+7 994 777-48-48',
  email = 'robokslip48@mail.ru',
  short_legal_name = 'ИП Юлдашев Рустам Хакимович',
  full_legal_name = 'Юлдашев Рустам Хакимович (ИП)',
  inn = '482426310695',
  ogrn = NULL,
  legal_address = '398057, Россия, Липецкая область, Липецк, ул. Артемова, 5а, 126',
  bank_name = 'АО "АЛЬФА-БАНК"',
  bank_inn = '7728168971',
  bik = '044525593',
  account_number = '40802810102930009628',
  correspondent_account = '30101810200000000593',
  bank_address = '398059, Липецк, ул. Барашева, д. 7'
WHERE slug = 'robotics-lipetsk';

-- 7. Configure Branches (Oskanova 3 and Slavyanova 1)
-- Update existing Main branch '120c1a93-8ef9-4eb5-8e7c-eb8ab57342fb'
UPDATE public.branches
SET
  name = 'Филиал на Осканова',
  address = 'Липецк, ул. Осканова, 3',
  phone = '+7 994 777-48-48',
  email = 'robokslip48@mail.ru',
  is_active = true,
  show_on_site = true,
  sort_order = 10,
  work_hours = 'Понедельник — Суббота: 09:00 - 20:00'
WHERE id = '120c1a93-8ef9-4eb5-8e7c-eb8ab57342fb';

-- Insert new branch '220c1a93-8ef9-4eb5-8e7c-eb8ab57342fb' (Slavyanova 1)
INSERT INTO public.branches (id, organization_id, name, address, phone, email, is_active, show_on_site, sort_order, work_hours)
VALUES (
  '220c1a93-8ef9-4eb5-8e7c-eb8ab57342fb',
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  'Филиал на Славянова',
  'Липецк, ул. Славянова, 1',
  '+7 994 777-48-48',
  'robokslip48@mail.ru',
  true,
  true,
  20,
  'Понедельник — Суббота: 09:00 - 20:00'
)
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  address = excluded.address,
  phone = excluded.phone,
  email = excluded.email,
  is_active = excluded.is_active,
  show_on_site = excluded.show_on_site,
  sort_order = excluded.sort_order,
  work_hours = excluded.work_hours;

-- 8. Seed/Update Teachers profiles with full, correct specialties & bios
UPDATE public.profiles SET
  specialty = 'дошкольники, школьники; LEGO Education, DUPLO, WeDo 2.0, EV3, Scratch',
  public_bio = 'Дарья ведёт занятия по робототехнике для дошкольников и школьников. Помогает детям освоить конструирование, первые алгоритмы и программирование на наборах LEGO Education, DUPLO, WeDo 2.0, EV3 и Scratch. На занятиях делает акцент на понятные объяснения, аккуратную сборку моделей и уверенное вовлечение ребёнка в инженерное творчество.',
  show_on_site = true,
  sort_order = 10,
  show_public_contacts = false
WHERE id = 'a1111111-e222-3333-4444-555555555555';

UPDATE public.profiles SET
  specialty = 'школьники старшего возраста; LEGO Education, WeDo 2.0, EV3, SPIKE Prime, Scratch',
  public_bio = 'Алена работает со школьниками старшего возраста и помогает им переходить от простого конструирования к более осознанной инженерной логике. На занятиях используются LEGO Education, WeDo 2.0, EV3, SPIKE Prime и Scratch. Ребята учатся собирать модели, программировать поведение роботов и разбирать задачи по шагам.',
  show_on_site = true,
  sort_order = 20,
  show_public_contacts = false
WHERE id = 'a2222222-e222-3333-4444-555555555555';

UPDATE public.profiles SET
  specialty = 'дошкольники и школьники младшего возраста; LEGO Education, DUPLO, WeDo 2.0, Scratch',
  public_bio = 'Дарья ведёт занятия для дошкольников и школьников младшего возраста. Она помогает детям познакомиться с робототехникой через понятные практические задания, работу с LEGO Education, DUPLO, WeDo 2.0 и Scratch. Основной акцент — развитие логики, внимания, самостоятельности и интереса к техническому творчеству.',
  show_on_site = true,
  sort_order = 30,
  show_public_contacts = false
WHERE id = 'a3333333-e222-3333-4444-555555555555';

UPDATE public.profiles SET
  specialty = 'программирование, алгоритмика, визуальное и базовое текстовое программирование, цифровые проекты',
  public_bio = 'Сергей ведёт направление программирования для детей. На занятиях ребята развивают алгоритмическое мышление, учатся разбирать задачи на шаги, создавать интерактивные проекты и постепенно переходить от визуального программирования к более системному пониманию кода. Занятия подходят детям, которым интересно создавать игры, анимации, цифровые проекты и понимать, как работает логика программ.',
  show_on_site = true,
  sort_order = 40,
  show_public_contacts = false
WHERE id = 'a4444444-e222-3333-4444-555555555555';

-- 9. Seed Default Tariffs
INSERT INTO public.course_tariffs (id, organization_id, title, audience, format, price, is_one_time, sort_order, show_on_site)
VALUES
  (
    '1e0d97b0-cbe6-444a-a006-2c5e533ebbbd',
    'a3848a60-a292-491a-85eb-7f2824cf4e77',
    'Пробный урок',
    'general',
    'Ознакомительное занятие для ребенка длительностью 90 минут.',
    0,
    true,
    10,
    true
  ),
  (
    '2e0d97b0-cbe6-444a-a006-2c5e533ebbbd',
    'a3848a60-a292-491a-85eb-7f2824cf4e77',
    'Месячный абонемент',
    'school',
    'Регулярные занятия в мини-группе 2 раза в неделю по 90 минут.',
    4000,
    false,
    20,
    true
  ),
  (
    '3e0d97b0-cbe6-444a-a006-2c5e533ebbbd',
    'a3848a60-a292-491a-85eb-7f2824cf4e77',
    'Индивидуальный',
    'school',
    'Персональный урок с наставником. Индивидуальный разбор сложных проектов.',
    1500,
    false,
    30,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  title = excluded.title,
  audience = excluded.audience,
  format = excluded.format,
  price = excluded.price,
  is_one_time = excluded.is_one_time,
  sort_order = excluded.sort_order,
  show_on_site = excluded.show_on_site;
