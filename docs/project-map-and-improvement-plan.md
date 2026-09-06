# EdCRM: карта проекта и план улучшений

Дата обследования: 6 сентября 2026. Базовый production SHA: `165e529d54cc0502c76286494a85e4d5e4b4bd69`.
Репозиторий: https://github.com/phamphuongthuy300699-collab/EdCRM.
Документ служит картой для последующих изменений. Обзор кода и конфигурации не является доказательством отсутствия всех ошибок; глубоко воспроизведены две заявленные неисправности. Остальные предложения ниже не реализуются в этом выпуске.

## 1. Текущее устройство проекта

### Назначение и окружения

Единый продукт образовательного центра «Робокс»: публичный сайт, CRM, кабинеты преподавателя, родителя и ученика, расписание, финансовый учёт, эквайринг и MAX. Архитектура multi-tenant: большинство рабочих сущностей содержит `organization_id`; основной production tenant — текущий центр. Не следует считать глобальный список таблицы допустимым бизнес-запросом.

Production: https://робокс48.рф (ASCII: https://xn--48-9kc0bsblm.xn--p1ai).
SSH: `deploy@5.42.114.231`, существующий ключ `~/.ssh/edcrm_timeweb_home`. Ключи и значения секретов в документ не включены.
Код сервера: `/opt/edcrm`, ветка `main`. Supabase: `/opt/supabase`. Медиа: `/opt/edcrm/media`. Backup: `/opt/backups/edcrm`.

Приложение работает в Docker Compose (`docker-compose.prod.yml`), контейнер `edcrm-edcrm-web-1`, образ `edcrm-web:prod`; порт опубликован на `127.0.0.1:3000`, внешний HTTPS обслуживает nginx. Supabase self-hosted отдельным стеком: PostgreSQL, Auth, PostgREST, Kong, Storage, Realtime, Studio, Meta, Pooler, Edge Functions, Imgproxy. Рабочая БД production — этот сервер, а не автоматически предполагаемый облачный Supabase-проект.

Vercel также создаёт deployments, включая окружение с названием `Production – robotics-crm`. Это название в GitHub не доказывает развёртывание на Timeweb. Для живого сервера нужно проверять Git SHA в `/opt/edcrm`, образ и фактические авторизованные HTTP-запросы. Документация описывает `develop` как preview, однако deployment records показывают и preview для main: эту схему следует формализовать.

Основная локальная копия на этом Mac: `/Users/oksanakurdukova/Documents/Codex/2026-07-04/files-mentioned-by-the-user-develop/EdCRM`. Папка `/Users/oksanakurdukova/Documents/CRM` содержит вспомогательные материалы, а не исходники приложения. Изолированные рабочие копии уже находятся в `~/.config/superpowers/worktrees/EdCRM/`.

### Стек и зависимости

Источник точных установленных версий — `package-lock.json`; диапазоны ниже взяты из manifests.

| Компонент | Версия / расположение | Назначение |
|---|---|---|
| npm workspaces | npm 11.9.0, корневой `package.json` | `apps/*`, `packages/*`, общие команды |
| Next.js | 16.3.0 | App Router, React UI, HTTP API, standalone build |
| React / React DOM | 19.2.4 | Клиентские формы и кабинеты |
| TypeScript | ^5 | Типы приложения |
| Supabase JS / SSR | ^2.108.2 / ^0.12.0 | REST/RPC, Auth, cookies, storage |
| Zod | ^4.4.3 | DTO и валидация входных данных |
| Lucide React | ^1.21.0 | Иконки |
| `@robotics-crm/ui` | `packages/ui/index.tsx` | Общие кнопки и элементы интерфейса |
| `pg` | ^8.22.0, корень | SQL/интеграционные сценарии |
| Vitest | 4.1.9 | Unit/component tests |
| Testing Library / jsdom | React ^14.2.1, jsdom ^24 | Проверки поведения компонентов |
| Playwright | ^1.42.1 в manifest, lock фиксирует установленную версию | Браузерные сценарии |
| ESLint / Next config | ESLint ^9, eslint-config-next 16.3.0 | Статический анализ |
| PostgreSQL / Supabase CLI | Docker / `supabase/config.toml` | Схема, RPC, RLS, pgTAP |

Не переносить привычные решения Next.js других версий без сверки с `node_modules/next/dist/docs/` и `apps/web/AGENTS.md`. Сейчас используется `middleware.ts`; установленный Next предупреждает о переходе к `proxy`, но это отдельная задача.

### Файловая структура и ответственность

| Путь от корня | Что находится и где менять |
|---|---|
| `apps/web/src/app/(public)/` | Публичные страницы, SEO landing pages, контакты, курсы, юридические страницы |
| `apps/web/src/app/(public)/LandingPageClient.tsx` | Основной интерактивный landing, карточки направлений |
| `apps/web/src/app/(crm)/crm/` | CRM: заявки, ученики, родители, группы, занятия, счета, платежи, финансы, отчёты, сайт, настройки |
| `apps/web/src/app/teacher/` | Кабинет преподавателя, проведение занятий, пробные участники, начисления |
| `apps/web/src/app/parent/` | Кабинет родителя, дети, расписание, финансы и оплаты |
| `apps/web/src/app/student/` | Кабинет ученика, доступные учебные материалы |
| `apps/web/src/app/pay/[publicId]/` | Публичная защищённая страница оплаты счёта |
| `apps/web/src/app/payments/{success,fail}/` | Возврат пользователя из банка; браузерный return не заменяет проверку статуса банком |
| `apps/web/src/app/api/` | Серверные route handlers; группы маршрутов перечислены ниже |
| `apps/web/src/features/` | Прикладная логика и UI по предметным областям |
| `apps/web/src/lib/` | Финансы, эквайринг, MAX, отчёты, безопасность |
| `apps/web/src/shared/db/` | Типы БД и три Supabase-клиента |
| `apps/web/src/shared/ui/` | Диалоги, подтверждения, подбор ученика, помощник |
| `apps/web/src/shared/utils/` | Медиа, lifecycle сущностей, публичное расписание, контакты, demo flags |
| `apps/web/src/shared/config/`, `shared/seo/` | Конфигурация публичного сайта и metadata |
| `packages/ui/`, `packages/tsconfig/`, `packages/eslint-config/` | Общие пакеты monorepo |
| `supabase/migrations/` | История SQL: таблицы, ограничения, RLS, триггеры, бизнес-функции |
| `supabase/tests/` | pgTAP и конкурентные проверки SQL |
| `apps/web/src/__tests__/`, `apps/web/e2e/` | Vitest и Playwright |
| `docs/`, `docs/superpowers/plans/` | Runbooks, предметная документация, история планов |
| `.github/workflows/` | CI и CodeQL; CI выполняет npm ci, lint, unit tests, build |
| `Dockerfile`, `docker-compose.prod.yml` | Сборка и запуск production |
| `.env.example` | Имена параметров окружения; реальные `.env` не коммитить |

### БД и авторизация

`shared/db/supabase/browser.ts` — браузерный клиент с пользовательской сессией, зависит от RLS.
`server.ts` — SSR/cookie клиент. `admin.ts` — серверный клиент с `SUPABASE_SECRET_KEY`, обходящий RLS; его вызовы требуют явной проверки роли и `organization_id`.
`api/crm/_shared.ts` предоставляет `requireCrmStaff`, наборы ролей и `crmAdmin`.

Канонический профиль сотрудника может не совпадать с Auth UUID. Цепочка:
`auth.users.id → staff_auth_identities.auth_user_id → staff_profile_id → profiles.id → org_memberships.user_id`.
`features/staff/auth-context.ts` разрешает эту связь на сервере. `browser-auth.ts` использует RPC `current_staff_profile_id`. Поля `groups.teacher_id`, `lesson_sessions.teacher_id`, payroll и audit ссылаются на профиль. Нельзя подставлять Auth UUID в эти поля без разрешения identity.

Роли: owner/admin/manager/teacher и финансовая роль accountant там, где явно разрешена. Родительские и ученические связи отдельные: `guardian_users`, `student_users`. `middleware.ts` контролирует защищённые маршруты, same-origin mutations и `private, no-store` для чувствительных API. Demo bypass управляется отдельными flags и не должен включаться в production.

Production на момент проверки: 48 учеников, 48 родителей, 16 групп, 42 зачисления, 24 правила расписания, 165 занятий, 18 счетов, 0 платежей, 0 пробных событий. Эти counts — снимок, а не постоянные инварианты количества.

### Ученики, родители, заявки

- `students` — ребёнок, статус, карточка, индивидуальный `lesson_price`, lifecycle.
- `guardians` — контакт родителя; `student_guardians` — многие-ко-многим, основной представитель и получатель счёта.
- `enrollments` — постоянное зачисление в группу, независимо от пробной записи.
- `leads` — заявка, этап воронки, возможная связь с учеником.
- `lead_interactions` — история контактов и followups как для заявки, так и для ученика/родителя.
- `features/students/`, `features/clients/`, `features/leads/` — DTO и предметные правила.
- API `crm/students/*`, `crm/guardians/*`, `crm/leads/convert`, `crm/interactions`, `crm/followups`, `crm/client-relations` — управление.
- `crm/entities/[entity]/[action]` и `shared/utils/entity-lifecycle.ts` — архивирование, восстановление и очистка согласно виду сущности.

Нельзя заменять архивирование физическим удалением: связаны занятия, счета, история и права доступа.

### Группы, расписание, пробные

`groups` связывает курс, филиал, кабинет, преподавателя и параметры оплаты. `group_schedule_rules` содержит повторяющиеся правила; `lesson_sessions` — конкретные занятия. Изменение одного не всегда тождественно обновлению другого. `features/scheduling/domain.ts` материализует даты; `schemas.ts` задаёт DTO; `ScheduleWorkspace.tsx` — CRM-расписание, `LessonConductPanel.tsx` и `AttendanceRoster.tsx` — проведение и посещаемость.

Основной API: `/api/crm/schedule`, `/api/crm/schedule/session/[sessionId]`, вложенное homework API. SQL RPC: `save_group_with_schedule`, `replace_group_schedule`, `transition_lesson_session`, `save_lesson_attendance`, `reschedule_lesson_session`.

`attendance` хранит отметки обычного состава; `makeup_assignments` — отработки. Статусы занятий: planned/live/completed/cancelled/moved. Преподаватель получает календарный диапазон и дополнительно все незавершённые live-занятия. `features/scheduling/teacher-portal.ts` разбивает выборку по разделам.

Пробные вынесены в отдельный контур:

- `trial_events`: attached_session ссылается на существующее занятие; standalone содержит собственные преподавателя, филиал, кабинет и время.
- `trial_participants`: ссылка на lead или student, статус/результат и комментарий.
- `features/trials/TrialDialog.tsx` и `TrialSubjectPicker.tsx` — общая форма из CRM; `TrialParticipantList.tsx` — результаты.
- `/api/crm/trials/options` — участники и ресурсы, текущий горизонт обычных занятий 14 дней.
- `/api/crm/trials` — чтение и атомарное создание через `crm_create_trial_event`.
- Вложенные API — изменение события и результата участника через отдельные RPC.
- Пробная запись сама по себе не создаёт enrollments, invoices или attendance. Вместимость и пересечения повторно проверяются SQL внутри транзакции.
- У trial_events две связи с profiles: teacher_id и created_by. В REST embedding преподавателя обязательна явная связь `profiles!trial_events_teacher_id_fkey(full_name)`.

Важные миграции: `20260830000001_trial_events_and_participants.sql`, `20260901000001_consolidate_trial_group_schedule.sql`. Последняя сохраняет одновременно защиту пробных участников и исправление self-conflict расписания; старые функции нельзя просто восстановить из раннего файла.

### Финансы: отдельные контуры

1. **Счета.** `invoices`, `invoice_discounts`, `discount_types`, `discount_assignments`, `course_tariffs`. API создания/ручного погашения — `crm/invoices/create`, `crm/invoices/settle`; RPC `crm_create_invoice_with_discount`, `settle_manual_invoice`.
2. **Эквайринг Альфа-Банка.** `lib/payments/alfabank/{client,mapper,status-service,types,errors,return-url}.ts`; API create/status/return-status/callback. `payment_provider_settings` хранит конфигурацию провайдера; `payments`, `payment_transactions`, `payment_events` — платёж и техническая история. Callback перепроверяет статус у банка; нельзя доверять return URL как доказательству оплаты.
3. **Публичные ссылки.** `invoice_payment_links`, `lib/payments/invoice-payment-links.ts`, `publish-invoice.ts`, `/pay/[publicId]`, API `payments/public-link/create` и `crm/invoice-payment-links`. Ссылка связана со счётом/получателем и является отдельным способом доступа, не общим доступом к CRM.
4. **Лицевой счёт семьи.** `billing_accounts`, неизменяемый `billing_ledger_entries`, `finance_warnings`. Зачисление оплаты и списание занятия — разные события. Корректировка выполняется компенсирующей записью через `apply_billing_adjustment`, а не редактированием ledger. `reconcile_paid_payment` и `reconcile_lesson_finance` восстанавливают пропуски идемпотентно.
5. **Стоимость занятия ученика.** Последняя миграция `20260831000003_student_lesson_pricing.sql` вводит персональную цену; проверять актуальную версию финансовых RPC, а не полагаться на более раннюю цену группы. Биллинг регулируется настройками группы и attendance; массово включать его при deploy нельзя.
6. **Начисления преподавателю.** `teacher_pay_rules`, `teacher_payroll_entries`, режим оплаты и effective date. Снимок начисления связан с конкретным занятием; это не входящий платёж родителя. API `crm/finance/teacher-rates`, `/api/teacher/payroll`; переходы статуса через `transition_teacher_payroll` / `transition_teacher_payroll_period`.
7. **Отчёты и сверка.** `api/crm/finance`, `finance/reconcile`, `finance/export`, `api/crm/reports`, `reports/export`, `lib/reports/*`, `lib/finance/*`.

Платежи не меняются в текущем исправлении. Существующая интеграция документирует полный возврат; поддержку частичных возвратов нельзя предполагать. Тестировать банк или MAX реальными внешними вызовами в обычном regression suite недопустимо.

### Учебный контент, сайт, файлы и коммуникации

Курсы: `courses`, `course_modules`; занятия и материалы: `lesson_templates`, `lesson_materials`, `homework_templates`, `homework_assignments`. Разделы CRM materials/homework/lessons и кабинеты используют эти связи. Доступность материалов зависит от lifecycle занятия.

Сайт: `site_content_blocks`, публичные поля courses/profiles, `features/site-editor/media/*`, API `crm/media`, `shared/utils/media.ts`, `site-media.ts`. Поддерживается local/Supabase media driver; в БД хранятся пути/URL, файлы лежат в storage. Для карточек курса используется `courses.card_image_url`. Проверять whitelist, usages и связь удаления файла с текущими публичными ссылками.

MAX: `lib/bots/max/*`, `/api/bots/max/webhook`, `crm/bot-settings/max/*`, `bot_settings`, `guardian_messenger_accounts`, `notification_outbox`. Планировщик вызывает `/api/jobs/notifications/process`; штатное описание в `docs/deployment/notifications-cron.md`. Наличие документа не доказывает, что cron реально установлен — нужна отдельная проверка runtime. В текущей задаче сообщения не отправляются.

Прочие справочники: organizations, branches, rooms, call_scripts, objections. Аудит: audit_log и crm_audit_log — учитывать оба при расследовании операций.

### Проверки и выпуск

Команды: `npm ci`, `npm run lint`, `npm --workspace apps/web test`, `npm --workspace apps/web run build`, `npm --workspace apps/web run test:e2e`. SQL-проверки: `supabase/tests/`, запускать против локальной/тестовой БД. Production reset/reseed запрещены.

CI сейчас проверяет lint/unit/build. Многие существующие тесты анализируют текст исходников или подменяют API, поэтому не ловят ошибки PostgREST embedding и перекрытие окна, если не происходит реальный click. SQL-тесты функции тоже не проверяют её REST-потребителей.

Перед выпуском сверить origin/main и сервер, backup по `docs/security/backup-restore.md`, новые миграции по фактической схеме, build и запуск образа. После — авторизованное чтение затронутых API, проверка сценария браузером и counts. `200 /api/health` не подтверждает работоспособность кабинета.

В production не обнаружена таблица `supabase_migrations.schema_migrations`. Поэтому стандартный `supabase db push` нельзя считать готовой безопасной процедурой для этого сервера без reconciliation истории. Схему проверять по pg_catalog и актуальным определениям функций; журнал применения миграций требует отдельной работы.

## 2. Последние изменения и deployments

Пять последних интеграционных шагов по first-parent main (это не пять PR: API merged PR вернул пустой список):

| SHA | Дата (Москва) | Содержание |
|---|---|---|
| 165e529 | 01.09 13:31 | Соединение ветки редактирования/пробных с main |
| 0d2cb66 | 01.09 13:31 | Интеграция карточки ученика и trial appointments, consolidation SQL |
| 0748221 | 01.09 00:42 | Персональная цена занятия ученика |
| 30fdda3 | 31.08 00:28 | Очистка legacy платежей и исправление редактирования расписания |
| d822ab8 | 16.08 20:15 | Согласование расписания, финансов и dashboard |

Последние пять GitHub deployment records: `6199358811` Production и `6199345253` Preview для 165e529; `6190180513` Production и `6190169406` Preview для 0748221; `6186623601` Preview для fbdf9e3 (dependency branch). Это записи Vercel. Последний подтверждённый Timeweb deploy перед текущим исправлением — 165e529, контейнер работал пять дней. CI/CodeQL этого коммита завершились успешно.

## 3. Вердикт по двум ошибкам

### Пробная запись из карточки ученика

В students/page.tsx TrialDialog расположен раньше drawer, оба используют CrmDialog с одинаковым z-index. После нажатия в карточке «Записать на пробное» drawer продолжает отображаться и перехватывает pointer events. Playwright воспроизвёл timeout на доступной кнопке «Записать 1» с явным указанием, что события перехватывает crm-dialog-backdrop-drawer. HTTP POST не происходит.

Исправление: пока trialStudent задан, drawer не отображается; selectedStudent и состояние редактора сохраняются. После закрытия пробной формы карточка возвращается. Проверяются оба режима записи. SQL создания для реального ученика отдельно проверен в production-транзакциях с ROLLBACK для standalone и attached_session, без сохранённых изменений.

### Пустой кабинет Шамрай

Доступ активен, mapping Auth → profile корректен. У профиля Шамрай есть 54 planned занятия (в том числе будущие). Авторизованный GET schedule возвращал 500 «Не удалось загрузить отдельные пробные занятия». Причина — unqualified profiles embedding trial_events: PostgREST возвращает PGRST201, потому что есть teacher_id и created_by. Даже пустая trial_events вызывает ошибку; teacher/page.tsx в catch очищает весь список.

Исправление: явно указать teacher FK в расписании и API списка trial_events. Исправленный запрос проверен против production PostgREST: 200 вместо 300/PGRST201. Менять флаг доступа Шамрай, её Auth ID или массово переносить занятия не требуется. Ошибка затрагивает общий код, поэтому ранний успешный опыт другого преподавателя не доказывает исправность кабинета после trial merge.

## 4. План улучшений — не реализован в текущем выпуске

| Приоритет | Наблюдение / риск | Предлагаемая работа и критерий готовности |
|---|---|---|
| P1 | CI зелёный, но реальные REST-запросы и пользовательский клик не проверены | Добавить обязательный тест локального Supabase/PostgREST и авторизованные e2e для trial create и teacher schedule; тест должен падать на PGRST201 и modal interception |
| P1 | Нет штатного migration ledger в production | Инвентаризировать определения/хеши схемы, восстановить проверяемый журнал применения, протестировать upgrade и fresh schema; не отмечать SQL применённым только по имени файла |
| P1 | Есть расхождения teacher_id между группами и материализованными занятиями | Выяснить, где намеренные замены, а где устаревшее расписание; добавить явную семантику замены и диагностику. Не массовый UPDATE по группе |
| P1 | Некоторые активные группы без занятий; у части занятия заканчиваются августом | Проверить статус, starts_on/ends_on, правила и горизонт materialization. Показать администратору предупреждение «назначена группа, но нет будущих занятий» |
| P1 | Один ошибочный запрос пробных скрывает всё расписание | После восстановления корректных запросов отдельно спроектировать частичную загрузку с явным предупреждением и наблюдаемостью, без выдачи ошибки за пустые данные |
| P1 | Deploy не проверяет реальные авторизованные сценарии | Версионировать процедуру Timeweb, сохранять SHA образа, схемы, результаты smoke, rollback plan; разделить имена Vercel и Timeweb production |
| P2 | Формы смешивают загрузку, DTO, сеть, modal state; страницы очень большие | Постепенно выделять прикладные сервисы/компоненты с поведенческими тестами, начиная с students/settings; без массового рефакторинга |
| P2 | Строгие API фильтры соседствуют с прямыми browser DB-запросами | Провести аудит RLS и tenant scope для каждого прямого запроса; серверный admin client всегда требует роли/tenant |
| P2 | В API местами игнорируются ошибки вторичных запросов, используется any | Возвращать различимые ошибки, логировать безопасный код/маршрут/correlation ID, генерировать актуальные DB types; не выводить PII и секреты |
| P2 | Общая система модальных окон не управляет стеком/focus | Спроектировать один активный modal/focus trap, Escape и восстановление scroll; закрытие/сохранение проверить на мобильных размерах |
| P2 | Trial options ограничены ближайшими 14 днями, дата фильтрует уже загруженный список | Загружать по выбранной дате и явно объяснять горизонт; показать ошибки окончания/начала возле полей |
| P2 | Nginx config вне репозитория, настройки backup/cron требуют runtime подтверждения | Версионировать обезличенные конфиги, проверять backup restore drill и фактический обработчик outbox без отправки тестов реальным родителям |
| P2 | Rate limit в `lib/security/rate-limit.ts` локален процессу | Оценить централизованный backend при масштабировании; тестировать несколько инстансов |
| P3 | Next сообщает deprecation middleware, документация cutover устарела | Отдельный upgrade PR и обновление runbooks после полного auth regression |

Конкретные расхождения снимка: у группы «Робототехника ст. ДШК Вт / Чт 17:00» назначена Шамрай, но 24 занятия имеют другого teacher_id; у «Программирование Scratch, робототехника Пн / Пт 16:45» назначена Троянова, но 25 занятий имеют другого teacher_id. Без истории операторских действий нельзя объявлять их ошибочными и автоматически менять.

При следующем изменении сначала открыть этот документ, затем соответствующий feature/API, актуальную последнюю SQL-функцию и её тесты. После изменения обновить карту и результаты проверки; не считать эту дату вечным описанием текущего состояния.

## 5. Полный индекс HTTP API и таблиц

Маршруты ниже автоматически перечислены из текущего дерева `apps/web/src/app/api`; обработчики находятся в соответствующих `route.ts`. Методы и авторизацию проверять в конкретном файле, наличие маршрута не означает доступность любой роли.

- `/api/bots/max/webhook`
- `/api/crm/bot-settings/max/check`
- `/api/crm/bot-settings/max/queue`
- `/api/crm/bot-settings/max`
- `/api/crm/bot-settings/max/subscribe`
- `/api/crm/client-relations`
- `/api/crm/dashboard`
- `/api/crm/entities/[entity]/[action]`
- `/api/crm/finance/export`
- `/api/crm/finance/reconcile`
- `/api/crm/finance`
- `/api/crm/finance/teacher-rates`
- `/api/crm/followups`
- `/api/crm/guardians/merge`
- `/api/crm/guardians`
- `/api/crm/interactions`
- `/api/crm/invoice-payment-links`
- `/api/crm/invoices/create`
- `/api/crm/invoices/settle`
- `/api/crm/leads/convert`
- `/api/crm/media`
- `/api/crm/parent-access/disable`
- `/api/crm/parent-access/issue`
- `/api/crm/parent-access/reset-password`
- `/api/crm/parent-access/status`
- `/api/crm/payment-settings/alfabank/check`
- `/api/crm/payment-settings/alfabank`
- `/api/crm/reports/export`
- `/api/crm/reports`
- `/api/crm/schedule`
- `/api/crm/schedule/session/[sessionId]/homework`
- `/api/crm/schedule/session/[sessionId]`
- `/api/crm/search`
- `/api/crm/staff/create`
- `/api/crm/staff/deactivate`
- `/api/crm/staff/list`
- `/api/crm/staff/managers`
- `/api/crm/staff/provision-access`
- `/api/crm/staff/reset-password`
- `/api/crm/staff/teachers`
- `/api/crm/staff/update`
- `/api/crm/students/[studentId]/finance`
- `/api/crm/students/[studentId]`
- `/api/crm/students/enrollment`
- `/api/crm/students/manage`
- `/api/crm/students/search`
- `/api/crm/students/status`
- `/api/crm/trials/[trialId]`
- `/api/crm/trials/options`
- `/api/crm/trials/participants/[participantId]`
- `/api/crm/trials`
- `/api/debug/public-data`
- `/api/health`
- `/api/jobs/notifications/process`
- `/api/parent/finance`
- `/api/parent/payment-status`
- `/api/parent/schedule`
- `/api/payments/alfabank/callback`
- `/api/payments/alfabank/create`
- `/api/payments/alfabank/return-status`
- `/api/payments/alfabank/status`
- `/api/payments/public-link/create`
- `/api/public/leads`
- `/api/teacher/payroll`

Таблицы public, подтверждённые через pg_catalog production (системные auth/storage/realtime исключены):

`attendance`, `audit_log`, `billing_accounts`, `billing_ledger_entries`, `bot_settings`, `branches`, `call_scripts`, `course_modules`, `course_tariffs`, `courses`, `crm_audit_log`, `discount_assignments`, `discount_types`, `enrollments`, `finance_warnings`, `group_schedule_rules`, `groups`, `guardian_messenger_accounts`, `guardian_users`, `guardians`, `homework_assignments`, `homework_templates`, `invoice_discounts`, `invoice_payment_links`, `invoices`, `lead_interactions`, `leads`, `lesson_materials`, `lesson_sessions`, `lesson_templates`, `makeup_assignments`, `notification_outbox`, `objections`, `org_memberships`, `organizations`, `payment_events`, `payment_provider_settings`, `payment_transactions`, `payments`, `profiles`, `rooms`, `site_content_blocks`, `staff_auth_identities`, `student_guardians`, `student_users`, `students`, `teacher_pay_rules`, `teacher_payroll_entries`, `trial_events`, `trial_participants`.
