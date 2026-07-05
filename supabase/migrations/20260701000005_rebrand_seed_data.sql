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
