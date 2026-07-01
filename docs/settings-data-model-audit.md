# Settings Data Model Audit

Дата аудита: 2026-07-01.

## Назначение

`/crm/settings` должен быть единым центром операционных справочников EdCRM: организация, филиалы, кабинеты, направления, группы, сотрудники, доступы и платежи. `/crm/site` остается редактором текстов, фото, SEO и визуальных блоков сайта.

## Таблицы

| Таблица | Уже есть | Добавлено миграцией `20260630000001_settings_directories.sql` | Где редактируется | Где используется публично |
| --- | --- | --- | --- | --- |
| `organizations` | `id`, `name`, `slug`, `city`, `timezone`, `created_at`, `updated_at` | `phone`, `email`, `legal_name`, `inn`, `ogrn` | `/crm/settings`, вкладка "Организация" | JSON-LD и контакты главной, общие настройки |
| `branches` | `id`, `organization_id`, `name`, `address`, `phone`, `is_active`, `created_at`; ранее добавлены `email`, `hours` | `work_hours`, `map_url`, `description`, `show_on_site`, `sort_order`, `updated_at` | `/crm/settings`, вкладка "Филиалы и кабинеты" | Главная, `/raspisanie`, контакты/адреса |
| `rooms` | `id`, `organization_id`, `branch_id`, `name`, `capacity`, `created_at` | `is_active`, `description`, `equipment`, `updated_at` | `/crm/settings`, вкладка "Филиалы и кабинеты" | `/raspisanie`, карточки групп |
| `courses` | `id`, `organization_id`, `title`, `slug`, `short_description`, `full_description`, `min_age`, `max_age`, `duration_minutes`, `price_monthly`, `is_public`, `sort_order`, `created_at`, `updated_at` | `is_active`, `seo_title`, `seo_description` | `/crm/settings`, вкладка "Направления" | Главная, форма заявки, `/stoimost`, `/raspisanie`, SEO страниц направлений |
| `groups` | `id`, `organization_id`, `course_id`, `branch_id`, `room_id`, `teacher_id`, `title`, `status`, `age_from`, `age_to`, `capacity`, `starts_on`, `ends_on`, `price_monthly`, `created_at`, `updated_at`; уже есть `show_on_site` | `sort_order` | `/crm/settings`, вкладка "Группы и расписание" | Главная, `/raspisanie`, расчет свободных мест |
| `group_schedule_rules` | `id`, `organization_id`, `group_id`, `weekday`, `starts_at`, `ends_at`, `created_at` | не требуется | структурный редактор расписания в `/crm/settings` | Главная и `/raspisanie` |
| `profiles` | `id`, `full_name`, `phone`, `avatar_url`, `created_at`, `updated_at` | `email`, `specialty`, `public_bio`, `internal_comment`, `show_on_site`, `sort_order` | `/crm/settings`, вкладка "Сотрудники и доступы" | Главная, блок преподавателей |
| `org_memberships` | `id`, `organization_id`, `user_id`, `role`, `is_active`, `created_at` | не требуется | `/crm/settings`, вкладка "Сотрудники и доступы" через server API | не показывается напрямую; определяет роль и доступ |
| `enrollments` | `id`, `organization_id`, `student_id`, `group_id`, `status`, `started_on`, `ended_on`, `created_at` | не требуется | CRM ученики/группы | расчет свободных мест |
| `invoices` | `id`, `organization_id`, `student_id`, `guardian_id`, `enrollment_id`, `status`, `title`, `amount`, `currency`, `due_date`, `issued_at`, `paid_at`, `created_at`, `updated_at` | не требуется | CRM оплаты | Parent Portal |
| `payments` | `id`, `organization_id`, `invoice_id`, `student_id`, `guardian_id`, `provider`, `status`, `amount`, `currency`, `provider_payment_id`, `paid_at`, `created_at`, `updated_at` | enum `payment_provider` расширен значением `alfabank` | CRM оплаты | Parent Portal, история оплат |
| `payment_transactions` | `id`, `organization_id`, `payment_id`, `provider`, `event_type`, `external_id`, `payload`, `received_at` | provider теперь может быть `alfabank` | серверные webhooks/аудит платежей | не показывается публично |
| `payment_provider_settings` | отсутствовала | новая таблица настроек провайдера онлайн-оплаты | `/crm/settings`, вкладка "Платежи" | Parent Portal решает, показывать ли кнопку онлайн-оплаты |
| `site_content_blocks` | `id`, `organization_id`, `page_slug`, `block_key`, `title`, `subtitle`, `content`, `status`, `sort_order`, `created_at`, `updated_at` | не требуется | `/crm/site` | тексты, SEO, фото, визуальные блоки главной |

## Единые источники данных

- Курсы и цены: `courses`, при необходимости индивидуальная цена группы в `groups.price_monthly`.
- Расписание: `groups` + `group_schedule_rules`.
- Адреса и кабинеты: `branches` + `rooms`.
- Преподаватели: `profiles` + `org_memberships` с ролью `teacher`.
- Онлайн-эквайринг: `payment_provider_settings` + server env-секреты.
- Тексты/фото/SEO сайта: `site_content_blocks`.

## Правила удаления

- Курсы, группы, филиалы, кабинеты и сотрудники не удаляются физически, если уже связаны с лидами, учениками, группами, занятиями, счетами или платежами.
- Для курсов используется `is_active = false` и/или `is_public = false`.
- Для филиалов используется `is_active = false` и/или `show_on_site = false`.
- Для кабинетов используется `is_active = false`.
- Для групп используется `status = closed` и/или `show_on_site = false`.
- Для сотрудников используется `org_memberships.is_active = false` и `profiles.show_on_site = false`.

## Экраны

- `/crm/settings?tab=organization`: реквизиты организации.
- `/crm/settings?tab=branches`: филиалы и кабинеты.
- `/crm/settings?tab=courses`: направления и цены.
- `/crm/settings?tab=groups`: группы и структурированное расписание.
- `/crm/settings?tab=staff`: сотрудники, роли и доступы.
- `/crm/settings?tab=payments`: ручные оплаты и Альфабанк.
- `/crm/site`: тексты, фото, SEO, визуальные блоки, ссылки на справочники.

## Публичные страницы

- Главная `/`: курсы из `courses`, расписание из `groups + group_schedule_rules`, преподаватели из `profiles + org_memberships`, адреса из `branches`.
- `/raspisanie`: активные группы с `show_on_site = true`, филиал, кабинет, преподаватель, свободные места.
- `/stoimost`: активные публичные курсы; если у группы есть индивидуальная цена, показывается минимальная цена "от".
- Форма заявки: только `courses.is_public = true` и `courses.is_active = true`.
