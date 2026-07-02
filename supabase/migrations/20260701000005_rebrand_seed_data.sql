-- Rebrand organization, seed courses and teachers
UPDATE public.organizations 
SET name = 'Робокс', city = 'Липецк'
WHERE id = 'a3848a60-a292-491a-85eb-7f2824cf4e77';

-- Update branches with Lipetsk address and Roboks contact details
UPDATE public.branches
SET name = 'Основной',
    address = '398057, Россия, Липецкая область, Липецк, ул. Артемова, 5а, 126',
    phone = '+7 994 777-48-48'
WHERE organization_id = 'a3848a60-a292-491a-85eb-7f2824cf4e77';

-- Seed/Update public Roboks courses
INSERT INTO public.courses (id, organization_id, title, slug, short_description, min_age, max_age, duration_minutes, price_monthly, is_public, sort_order)
VALUES
  ('4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Робототехника (Lego Education)', 'robotics-lego', 'Курс конструирования и программирования роботов для детей на базе Lego Education.', 6, 12, 90, 3000.00, true, 10),
  ('1d0d97b0-cbe6-444a-a006-2c5e533ebbbd', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Scratch и основы программирования', 'scratch', 'Создание интерактивных историй, игр и анимации.', 8, 12, 90, 3500.00, true, 20),
  ('2d0d97b0-cbe6-444a-a006-2c5e533ebbbd', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Программирование на Python', 'python', 'Освоение профессионального программирования на простых и понятных задачах.', 10, 14, 90, 3500.00, true, 30),
  ('3d0d97b0-cbe6-444a-a006-2c5e533ebbbd', 'a3848a60-a292-491a-85eb-7f2824cf4e77', 'Arduino и схемотехника', 'arduino', 'Проектирование электронных схем, умных устройств и программирование микроконтроллеров.', 10, 15, 90, 4800.00, true, 40)
ON CONFLICT (id) DO UPDATE SET
  title = excluded.title,
  slug = excluded.slug,
  short_description = excluded.short_description,
  min_age = excluded.min_age,
  max_age = excluded.max_age,
  duration_minutes = excluded.duration_minutes,
  price_monthly = excluded.price_monthly,
  is_public = excluded.is_public,
  sort_order = excluded.sort_order;

-- Add slug column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Seed Auth Users for teachers
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES
  ('a1111111-e222-3333-4444-555555555555', 'paramonovadara838@mail.ru', '$2a$10$abcdefghijklmn...', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('a2222222-e222-3333-4444-555555555555', 'alena-yakunina@mail.ru', '$2a$10$abcdefghijklmn...', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('a3333333-e222-3333-4444-555555555555', 'dasha_pantyukhina@mail.ru', '$2a$10$abcdefghijklmn...', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
  ('a4444444-e222-3333-4444-555555555555', 'fedorenko3d@yandex.ru', '$2a$10$abcdefghijklmn...', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Seed teacher profiles
INSERT INTO public.profiles (id, full_name, phone, email, specialty, public_bio, show_on_site, sort_order, slug)
VALUES
  ('a1111111-e222-3333-4444-555555555555', 'Загрядская Дарья', '+7 905 684-60-65', 'paramonovadara838@mail.ru', 'дошкольники, школьники; LEGO Education, DUPLO, WeDo 2.0, EV3, Scratch', 'Опыт работы с детьми младшего возраста, индивидуальный подход к каждому ребенку.', true, 10, 'zagryadskaya-darya'),
  ('a2222222-e222-3333-4444-555555555555', 'Шамрай Алена', '8-905-045-10-12', 'alena-yakunina@mail.ru', 'школьники старшего возраста; LEGO Education, WeDo 2.0, EV3, SPIKE Prime, Scratch', 'Специализируется на сложных робототехнических системах и подготовке к соревнованиям.', true, 20, 'shamray-alena'),
  ('a3333333-e222-3333-4444-555555555555', 'Троянова Дарья', '+7 920 501-54-91', 'dasha_pantyukhina@mail.ru', 'дошкольники и школьники младшего возраста; LEGO Education, DUPLO, WeDo 2.0, Scratch', 'Увлеченный педагог, развивающий мелкую моторику и логику с ранних лет.', true, 30, 'troyanova-darya'),
  ('a4444444-e222-3333-4444-555555555555', 'Федоренко Сергей', NULL, 'fedorenko3d@yandex.ru', 'программирование, алгоритмика, визуальное и базовое текстовое программирование, создание цифровых проектов', 'Основное направление — программирование. На занятиях Сергей делает акцент на алгоритмику, развитие логики, визуальное и базовое текстовое программирование. Он обучает созданию цифровых проектов и игр с понятной подачей для детей всех возрастов.', true, 40, 'fedorenko-sergey')
ON CONFLICT (id) DO UPDATE SET
  full_name = excluded.full_name,
  phone = excluded.phone,
  email = excluded.email,
  specialty = excluded.specialty,
  public_bio = excluded.public_bio,
  show_on_site = excluded.show_on_site,
  sort_order = excluded.sort_order,
  slug = excluded.slug;

-- Seed Org Memberships for teachers
INSERT INTO public.org_memberships (organization_id, user_id, role, is_active)
VALUES
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'a1111111-e222-3333-4444-555555555555', 'teacher', true),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'a2222222-e222-3333-4444-555555555555', 'teacher', true),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'a3333333-e222-3333-4444-555555555555', 'teacher', true),
  ('a3848a60-a292-491a-85eb-7f2824cf4e77', 'a4444444-e222-3333-4444-555555555555', 'teacher', true)
ON CONFLICT (organization_id, user_id) DO NOTHING;
