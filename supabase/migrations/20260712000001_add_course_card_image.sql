alter table public.courses
  add column if not exists card_image_url text,
  add column if not exists card_image_alt text;

comment on column public.courses.card_image_url is
  'Relative media storage path or public URL for the course card background image.';

comment on column public.courses.card_image_alt is
  'Accessible description of the course card background image.';
