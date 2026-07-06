-- Seed editable public-site content blocks without overwriting production edits.
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

  insert into public.site_content_blocks (organization_id, page_slug, block_key, title, subtitle, content, status)
  values (
    org_id,
    '/',
    'site.footer',
    'Футер сайта',
    'Параметры отображения нижней части страниц',
    '{
      "showLegalName": true,
      "showInn": true,
      "showBankRequisites": false,
      "showBranchAddresses": true,
      "showLegalAddress": false,
      "copyrightText": "© {year} Робокс Липецк. Все права защищены.",
      "socials": { "vk": "", "telegram": "", "whatsapp": "" },
      "documentLinks": [
        { "id": "legal", "title": "Реквизиты", "href": "/legal", "enabled": true, "sortOrder": 10 },
        { "id": "privacy", "title": "Политика обработки данных", "href": "/privacy", "enabled": true, "sortOrder": 20 },
        { "id": "offer", "title": "Публичная оферта", "href": "/offer", "enabled": true, "sortOrder": 30 },
        { "id": "payment", "title": "Условия оплаты", "href": "/payment", "enabled": true, "sortOrder": 40 },
        { "id": "refund", "title": "Условия возврата", "href": "/refund", "enabled": true, "sortOrder": 50 },
        { "id": "privacy-policy", "title": "Конфиденциальность", "href": "/privacy-policy", "enabled": true, "sortOrder": 60 },
        { "id": "consent", "title": "Согласие на ОПД", "href": "/consent", "enabled": true, "sortOrder": 70 }
      ]
    }'::jsonb,
    'published'
  ) on conflict (organization_id, page_slug, block_key) do nothing;

  insert into public.site_content_blocks (organization_id, page_slug, block_key, title, subtitle, content, status)
  values (
    org_id,
    '/contacts',
    'contacts.page',
    'Контакты',
    'Свяжитесь с нами, выберите удобный филиал или запишитесь на пробное занятие.',
    '{
      "eyebrow": "Робокс",
      "title": "Контакты",
      "subtitle": "Свяжитесь с нами, выберите удобный филиал или запишитесь на пробное занятие.",
      "notice": "Официальные реквизиты школы Робокс.",
      "showBranches": true,
      "showLegalSummary": true,
      "showBankRequisites": false,
      "showMapLinks": true,
      "ctaTitle": "Записаться на пробное занятие",
      "ctaText": "Оставьте заявку, и администратор подберет удобную группу и филиал.",
      "ctaHref": "/#lead-form"
    }'::jsonb,
    'published'
  ) on conflict (organization_id, page_slug, block_key) do nothing;

  insert into public.site_content_blocks (organization_id, page_slug, block_key, title, subtitle, content, status)
  values (
    org_id,
    '/',
    'home.testimonials',
    'Отзывы родителей',
    'Мнения семей наших учеников, которые уже оценили прогресс в обучении',
    '{
      "enabled": true,
      "title": "Отзывы родителей",
      "subtitle": "Мнения семей наших учеников, которые уже оценили прогресс в обучении",
      "items": []
    }'::jsonb,
    'published'
  ) on conflict (organization_id, page_slug, block_key) do nothing;

  insert into public.site_content_blocks (organization_id, page_slug, block_key, title, subtitle, content, status)
  values (
    org_id,
    '/',
    'home.student_projects',
    'Проекты наших учеников',
    'Посмотрите, какие реальные инженерные проекты собирают и программируют дети',
    '{
      "enabled": true,
      "title": "Проекты наших учеников",
      "subtitle": "Посмотрите, какие реальные инженерные проекты собирают и программируют дети",
      "items": []
    }'::jsonb,
    'published'
  ) on conflict (organization_id, page_slug, block_key) do nothing;

  insert into public.site_content_blocks (organization_id, page_slug, block_key, title, subtitle, content, status)
  values (
    org_id,
    '/',
    'home.lesson_process',
    'Как проходит занятие: 5 этапов урока',
    'Занятие строится как полноценный спринт разработки',
    '{
      "enabled": true,
      "title": "Как проходит занятие: 5 этапов урока",
      "subtitle": "Занятие строится как полноценный спринт разработки",
      "steps": []
    }'::jsonb,
    'published'
  ) on conflict (organization_id, page_slug, block_key) do nothing;
end
$$;
