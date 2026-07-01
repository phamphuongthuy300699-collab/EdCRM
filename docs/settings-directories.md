# Настройки и справочники EdCRM

`/crm/settings` — центр операционных данных школы.  
`/crm/site` — редактор текстов, фото, SEO и визуальных блоков сайта.

## Справочники

| Раздел | Таблицы | Что редактируется | Куда уходит |
| --- | --- | --- | --- |
| Организация | `organizations` | название, город, timezone, телефон, email, юр. название, ИНН, ОГРН | JSON-LD, контакты, служебные настройки |
| Филиалы | `branches` | адрес, телефон, email, режим, карта, описание, активность, показ на сайте, сортировка | главная, `/raspisanie`, контакты |
| Кабинеты | `rooms` | филиал, название, вместимость, оборудование, описание, активность | группы, `/raspisanie` |
| Направления | `courses` | название, slug, описания, возраст, длительность, цена, SEO, активность, показ на сайте | главная, форма заявки, `/stoimost`, `/raspisanie` |
| Группы | `groups`, `group_schedule_rules` | курс, филиал, кабинет, преподаватель, статус, вместимость, цена группы, расписание | главная, `/raspisanie`, свободные места |
| Сотрудники | `profiles`, `org_memberships`, Supabase Auth | логин, ФИО, телефон, роль, специализация, био, показ на сайте, доступ | CRM, `/teacher`, блок преподавателей |
| Платежи | `payment_provider_settings`, env | ручные оплаты, Альфабанк test/live, merchant/terminal/url, статус ключей | Parent Portal, счета |

## Где редактировать

- Курсы, цены и SEO направлений: `/crm/settings?tab=courses`.
- Расписание и группы: `/crm/settings?tab=groups`.
- Филиалы и кабинеты: `/crm/settings?tab=branches`.
- Преподаватели и роли: `/crm/settings?tab=staff`.
- Тексты, фото, Hero, SEO главной и preview кабинета: `/crm/site`.

## Правила публикации

- Курс виден на сайте только если `courses.is_public = true` и `courses.is_active = true`.
- Группа видна на сайте только если `groups.status = active` и `groups.show_on_site = true`.
- Филиал виден на сайте только если `branches.is_active = true` и `branches.show_on_site = true`.
- Преподаватель виден на сайте, если у него роль `teacher`, активный `org_memberships` и `profiles.show_on_site = true`.
- Цена берется из `courses.price_monthly`; если у группы заполнена `groups.price_monthly`, публичная стоимость может показываться как минимальная цена "от".

## Архивирование

Hard delete не используется для операционных сущностей.

- Курс: `is_active = false`, `is_public = false`.
- Филиал: `is_active = false`, `show_on_site = false`.
- Кабинет: `is_active = false`.
- Группа: `status = closed`, `show_on_site = false`.
- Сотрудник: `org_memberships.is_active = false`, `profiles.show_on_site = false`.

Так сохраняются связи с учениками, лидами, счетами, посещаемостью и историей CRM.

## Как создать преподавателя

1. Откройте `/crm/settings?tab=staff`.
2. Нажмите "Добавить сотрудника".
3. Укажите ФИО, email/login, телефон и роль `teacher`.
4. Заполните специализацию и публичное описание.
5. Включите "Показывать на сайте", если преподаватель должен попасть в публичный блок.
6. Сохраните. CRM создаст Supabase Auth user, `profiles` и `org_memberships`.
7. Передайте сотруднику временный пароль или используйте "Сбросить пароль".

После входа пользователь с ролью `teacher` попадает в `/teacher`.

## Как подключить Альфабанк

1. В server env задайте:
   - `ALFABANK_USERNAME`
   - `ALFABANK_PASSWORD`
   - `ALFABANK_API_URL` при необходимости.
2. Откройте `/crm/settings?tab=payments`.
3. Включите онлайн-оплату.
4. Выберите режим `test` или `live`.
5. Заполните `merchant_id`, `terminal_id`, `return_url`, `fail_url`, `webhook_url`.
6. Нажмите "Проверить подключение" и "Сохранить Альфабанк".

Секреты не сохраняются в базе и не попадают в browser bundle. Parent Portal показывает кнопку оплаты только если Альфабанк включен и серверные ключи настроены.
