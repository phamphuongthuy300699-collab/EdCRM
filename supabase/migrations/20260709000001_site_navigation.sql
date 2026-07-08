do $$
declare
  org_id uuid;
begin
  select id into org_id
  from public.organizations
  where slug = 'robotics-lipetsk'
  limit 1;

  if org_id is null then
    return;
  end if;

  insert into public.site_content_blocks (
    organization_id,
    page_slug,
    block_key,
    title,
    subtitle,
    content,
    status,
    sort_order
  )
  values (
    org_id,
    '/',
    'site.navigation',
    'Навигация сайта',
    'Ссылки в шапке и футере публичного сайта',
    '{
      "headerLinks": [
        { "id": "courses", "title": "Курсы", "href": "/#courses", "enabled": true, "sortOrder": 10 },
        { "id": "prices", "title": "Цены", "href": "/#prices", "enabled": true, "sortOrder": 20 },
        { "id": "schedule", "title": "Расписание", "href": "/#schedule", "enabled": true, "sortOrder": 30 },
        { "id": "teachers", "title": "Преподаватели", "href": "/#teachers", "enabled": true, "sortOrder": 40 },
        { "id": "contacts", "title": "Контакты", "href": "/contacts", "enabled": true, "sortOrder": 50 }
      ],
      "footerLinks": [
        { "id": "robotics", "title": "Робототехника", "href": "/robototekhnika-dlya-detey-lipetsk", "enabled": true, "sortOrder": 10 },
        { "id": "programming", "title": "Программирование", "href": "/programmirovanie-dlya-detey-lipetsk", "enabled": true, "sortOrder": 20 },
        { "id": "schedule", "title": "Расписание", "href": "/raspisanie", "enabled": true, "sortOrder": 30 },
        { "id": "prices", "title": "Стоимость", "href": "/stoimost", "enabled": true, "sortOrder": 40 },
        { "id": "teachers", "title": "Преподаватели", "href": "/#teachers", "enabled": true, "sortOrder": 50 },
        { "id": "contacts", "title": "Контакты", "href": "/contacts", "enabled": true, "sortOrder": 60 }
      ]
    }'::jsonb,
    'published',
    15
  )
  on conflict (organization_id, page_slug, block_key) do nothing;
end $$;
