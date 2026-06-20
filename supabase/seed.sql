-- Seed initial organization
insert into public.organizations (id, name, slug, city, timezone)
values (
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  'Робототехника Липецк',
  'robotics-lipetsk',
  'Липецк',
  'Europe/Moscow'
) on conflict (slug) do nothing;

-- Seed branches
insert into public.branches (id, organization_id, name, address, phone, is_active)
values (
  '120c1a93-8ef9-4eb5-8e7c-eb8ab57342fb',
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  'Основной',
  'ул. Ленина, д. 10',
  '+7 (999) 123-45-67',
  true
);

-- Seed rooms
insert into public.rooms (id, organization_id, branch_id, name, capacity)
values (
  'd0d82998-d102-411a-8742-1e967a57c1d3',
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  '120c1a93-8ef9-4eb5-8e7c-eb8ab57342fb',
  'Кабинет 101 (Лего-конструирование)',
  10
);

-- Seed courses
insert into public.courses (id, organization_id, title, slug, short_description, min_age, max_age, duration_minutes, price_monthly, is_public, sort_order)
values 
(
  '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a',
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  'Робототехника (Lego Education)',
  'robotics-lego',
  'Курс конструирования и программирования роботов для детей на базе Lego Education.',
  6,
  10,
  90,
  4500.00,
  true,
  10
),
(
  '1d0d97b0-cbe6-444a-a006-2c5e533ebbbd',
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  'Программирование на Scratch',
  'scratch',
  'Создание интерактивных историй, игр и анимации.',
  8,
  12,
  90,
  4000.00,
  true,
  20
)
on conflict (organization_id, slug) do nothing;
