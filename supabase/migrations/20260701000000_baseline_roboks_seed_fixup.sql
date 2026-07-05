-- Ensure the baseline Roboks organization and primary course exist before
-- later production migrations insert settings, discounts, tariffs and groups.

insert into public.organizations (id, name, slug, city, timezone)
values (
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  'Робокс',
  'robotics-lipetsk',
  'Липецк',
  'Europe/Moscow'
)
on conflict (id) do update set
  name = coalesce(public.organizations.name, excluded.name),
  slug = coalesce(public.organizations.slug, excluded.slug),
  city = coalesce(public.organizations.city, excluded.city),
  timezone = coalesce(public.organizations.timezone, excluded.timezone),
  updated_at = now();

insert into public.courses (
  id,
  organization_id,
  title,
  slug,
  short_description,
  min_age,
  max_age,
  duration_minutes,
  price_monthly,
  is_public,
  sort_order
)
values (
  '4f8d5918-a6fe-4fbe-9b37-236b28ee2e7a',
  'a3848a60-a292-491a-85eb-7f2824cf4e77',
  'Робототехника (Lego Education)',
  'robotics-lego',
  'Курс конструирования и программирования роботов для детей на базе Lego Education.',
  6,
  12,
  90,
  3000.00,
  true,
  10
)
on conflict (id) do update set
  organization_id = excluded.organization_id,
  title = coalesce(public.courses.title, excluded.title),
  slug = coalesce(public.courses.slug, excluded.slug),
  short_description = coalesce(public.courses.short_description, excluded.short_description),
  min_age = coalesce(public.courses.min_age, excluded.min_age),
  max_age = coalesce(public.courses.max_age, excluded.max_age),
  duration_minutes = coalesce(public.courses.duration_minutes, excluded.duration_minutes),
  price_monthly = coalesce(public.courses.price_monthly, excluded.price_monthly),
  is_public = coalesce(public.courses.is_public, excluded.is_public),
  sort_order = coalesce(public.courses.sort_order, excluded.sort_order),
  updated_at = now();
