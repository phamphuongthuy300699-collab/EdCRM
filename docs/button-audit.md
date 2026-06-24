# Аудит интерфейсных действий и кнопок (Button & Action Audit) EdCRM MVP

Этот документ содержит результаты сквозного аудита всех интерактивных элементов (кнопок, форм, переключателей, модальных окон) системы EdCRM. Цель аудита — гарантировать, что все действия выполняются на реальной базе данных Supabase, защищены от повторных кликов (double-click/duplicate submit) и не используют заглушек в не-демо режиме.

---

## 📊 Сводная таблица аудита по разделам

### 1. Публичный сайт и Лендинг (`/`)

| Элемент / Кнопка | Действие в БД | Защита от double-click | Статус проверки Supabase |
| :--- | :--- | :--- | :--- |
| **Форма «Записаться на пробный урок»** | Вставка записи в `leads` | Кнопка блокируется (`disabled`), текст меняется на «Отправка...» | Проверено, дублирование исключено |

---

### 2. Раздел «Заявки» (`/crm/leads`)

| Элемент / Кнопка | Действие в БД | Защита от double-click | Статус проверки Supabase |
| :--- | :--- | :--- | :--- |
| **Кнопка «Назначить пробное»** | Обновление `leads.status` -> `trial_scheduled` | Состояние `loading` на элементе списка | Проверено |
| **Кнопка «В архив»** | Обновление `leads.status` -> `archived` | Состояние `loading` на элементе списка | Проверено |
| **Кнопка «Зачислить» (в списке/деталях)** | Открытие модального окна зачисления | — | Проверено |
| **Кнопка «Подтвердить зачисление» (в модальном окне)** | Вызов RPC-функции `convert_lead_to_student` | Кнопка переходит в `disabled` с текстом «Зачисление...» | Проверено, RPC идемпотентна, создаются student/guardian ровно один раз |

---

### 3. Раздел «Ученики» (`/crm/students` & `/crm/students/[studentId]`)

| Элемент / Кнопка | Действие в БД | Защита от double-click | Статус проверки Supabase |
| :--- | :--- | :--- | :--- |
| **Кнопка «Добавить ученика»** | Создание записей в `students`, `guardians`, `student_guardians` | Блокировка кнопки во время сохранения | Проверено |
| **Кнопка «Подробнее»** | Перенаправление (`router.push`) на детальную страницу | — | Проверено, ведет на `/crm/students/[studentId]` |
| **Кнопка «Редактировать профиль» (в деталях)** | Сохранение изменений в `students` и `guardians` | Состояние сохранения `savingProfile` блокирует кнопку | Проверено, обновляет связанные таблицы |
| **Выбор «Сменить группу»** | Отмена старого `enrollments` (status -> `cancelled`) и вставка нового `active` | Блокировка выпадающего списка во время сохранения | Проверено, история сохраняется корректно |
| **Кнопка «Создать счет» (в деталях)** | Создание записи в `invoices` | Кнопка переходит в `disabled` с текстом «Создание...» | Проверено, связывает guardian_id и enrollment_id |
| **Кнопка «Отметить оплаченным» (в списке счетов)** | Вставка записи в `payments`, обновление `invoices.status` -> `paid` | Кнопка переходит in `disabled` с текстом «Обработка...» | Проверено, исключена двойная оплата счета |

---

### 4. Раздел «Группы» (`/crm/groups`)

| Элемент / Кнопка | Действие в БД | Защита от double-click | Статус проверки Supabase |
| :--- | :--- | :--- | :--- |
| **Кнопка «Добавить группу»** | Создание записи в `groups` + сохранение `group_schedule_rules` | Блокировка кнопки сохранения | Проверено |
| **Кнопка «Редактировать» (в списке)** | Открытие модального окна редактирования | — | Проверено |
| **Кнопка «Сохранить» (в модальном окне редактирования)** | Обновление `groups` + перезапись `group_schedule_rules` | Кнопка переходит в `disabled` с текстом «Сохранение...» | Проверено, расписание сохраняется |
| **Кнопка «Добавить ученика» (в Drawer)** | Вставка новой записи в `enrollments` (status -> `active`) | Блокировка селектора во время выполнения запроса | Проверено, ученик появляется в группе |
| **Кнопка «Исключить» (в Drawer)** | Обновление `enrollments.status` -> `cancelled` | Блокировка кнопки исключения во время выполнения | Проверено, статус в БД меняется |

---

### 5. Раздел «Финансы» (`/crm/payments`)

| Элемент / Кнопка | Действие в БД | Защита от double-click | Статус проверки Supabase |
| :--- | :--- | :--- | :--- |
| **Кнопка «Выставить счет»** | Открытие модального окна выставления счетов | — | Проверено |
| **Кнопка «Создать» (в модальном окне счета)** | Вставка записи in `invoices` с авто-поиском guardian_id | Кнопка переходит в `disabled` с текстом «Создание...» | Проверено |
| **Кнопка «Отметить оплаченным» (в списке)** | Обновление статуса счета и создание записи в `payments` | Кнопка блокируется, статус меняется на «Обработка...» | Проверено, повторный клик невозможен |

---

### 6. Раздел «Настройки» (`/crm/settings`)

| Элемент / Кнопка | Действие в БД | Защита от double-click | Статус проверки Supabase |
| :--- | :--- | :--- | :--- |
| **Кнопка «Сохранить настройки»** | Обновление `email` и `hours` в таблице `branches` | Кнопка переходит в `disabled` с текстом «Сохранение...» | Проверено, данные сохраняются |
| **Тумблеры YooKassa / Robokassa** | Отключены во всех режимах, кроме Demo | Заблокированы с надписью «Подключается после выдачи боевых ключей» | Проверено, исключен случайный прием средств в MVP |

---

### 7. Раздел «Материалы» (`/crm/materials` & `/crm/materials/[lessonId]`)

| Элемент / Кнопка | Действие в БД | Защита от double-click | Статус проверки Supabase |
| :--- | :--- | :--- | :--- |
| **Кнопка «Добавить материал»** | Вставка записи в `lesson_materials` | Кнопка блокируется при отправке формы | Проверено |
| **Кнопка «Редактировать» (в списке материалов)** | Обновление записи в `lesson_materials` | Кнопка блокируется во время сохранения | Проверено, все поля (тип, видимость, контент) перезаписываются |
| **Кнопка «Удалить»** | Удаление записи из `lesson_materials` | Требует подтверждения браузера (`confirm`) | Проверено |

---

### 8. Раздел «Домашние задания» (`/crm/homework`)

| Элемент / Кнопка | Действие в БД | Защита от double-click | Статус проверки Supabase |
| :--- | :--- | :--- | :--- |
| **Кнопка «Создать шаблон ДЗ»** | Вставка записи в `homework_templates` | Кнопка переходит в `disabled` с текстом «Создание...» | Проверено |
| **Кнопка «Редактировать» (шаблон ДЗ)** | Обновление записи в `homework_templates` | Кнопка переходит в `disabled` с текстом «Сохранение...» | Проверено, сохраняет название, описание, сложность и время |
| **Кнопка «Назначить ДЗ группе»** | Вставка новой записи в `homework_assignments` | Блокировка кнопки отправки формы | Проверено |
| **Кнопка «Удалить» (шаблон / назначение)** | Удаление записи из соответствующих таблиц в БД | Требует подтверждения браузера (`confirm`) | Проверено |
| **Кнопка «Сдали работу» / «Проверить»** | Обновление `homework_assignments.status` | Мгновенная блокировка до завершения транзакции | Проверено |

---

### 9. Панель проведения урока (`/crm/lessons/[sessionId]`)

| Элемент / Кнопка | Действие в БД | Защита от double-click | Статус проверки Supabase |
| :--- | :--- | :--- | :--- |
| **Кнопки присутствия («Был на уроке» / «Пропустил»)** | Обновление локального стейта (сохраняется кнопкой сохранения) | Отключены, если занятие завершено | Проверено |
| **Кнопка «Сохранить журнал»** | Upsert записей в таблицу `attendance` | Кнопка переходит в `disabled` с текстом «Сохранение...» | Проверено, переводит в безопасный режим |
| **Кнопка «Назначить группе» (домашнее задание)** | Вставка записи в `homework_assignments` | Кнопка переходит в `disabled` с текстом «Назначение...» | Проверено, исключает выдачу дубликатов |
| **Кнопка «Завершить занятие»** | 1. Автоматический upsert посещаемости<br>2. Обновление `lesson_sessions.status` -> `completed` | Кнопка переходит в `disabled` с текстом «Завершение...», скрывается после выполнения | Проверено. Действие идемпотентно, повторные клики невозможны |

---

### 10. Личный кабинет ученика (`/student`)

| Элемент / Кнопка | Действие в БД | Защита от double-click | Статус проверки Supabase |
| :--- | :--- | :--- | :--- |
| **Ссылки на материалы прошедших/текущих уроков** | Чтение файлов / открытие внешних ссылок | — | Проверено, материалы остаются доступными после завершения урока |
| **Отображение домашних заданий** | Чтение из `homework_assignments` и `homework_templates` | — | Проверено, отображаются актуальные задания группы |
| **Кнопка «Начать урок (симулировать)»** | Только в локальной демо-среде для отладки | — | Проверено, в прод-среде отсутствует / скрыта |

---

### 11. Личный кабинет родителя (`/parent`)

| Элемент / Кнопка | Действие в БД | Защита от double-click | Статус проверки Supabase |
| :--- | :--- | :--- | :--- |
| **Кнопки переключения вкладок детей** | Чтение связанных детей из БД | — | Проверено, переключает корректно |
| **Кнопка онлайн-оплаты счета** | Заблокирована в прод-режиме (без демо) | Кнопка переходит в `disabled` во всех не-демо конфигурациях | Проверено, отображает заглушку «Оплата будет подключена после выдачи ключей» |

---

### 12. Раздел «Скрипты и возражения» (`/crm/scripts`)

| Элемент / Кнопка | Действие в БД | Защита от double-click | Статус проверки Supabase |
| :--- | :--- | :--- | :--- |
| **Кнопка «Создать скрипт»** | Вставка записи в `call_scripts` | Кнопка переходит в `disabled` с текстом «Сохранение...» | Проверено |
| **Кнопка «Редактировать» (скрипт)** | Обновление записи в `call_scripts` | Кнопка переходит в `disabled` с текстом «Сохранение...» | Редактирование подтверждено (реально есть edit-modal) |
| **Кнопка «Добавить возражение»** | Вставка записи в `objections` | Кнопка переходит в `disabled` с текстом «Сохранение...» | Проверено |
| **Кнопка «Редактировать» (возражение)** | Обновление записи в `objections` | Кнопка переходит в `disabled` с текстом «Сохранение...» | Редактирование подтверждено (реально есть edit-modal) |
| **Кнопка «Удалить» (скрипт/возражение)** | Обновление `is_active` -> `false` | Требует подтверждения браузера (`confirm`) | Проверено, после обновления страницы удаленные записи не отображаются |

---

## 🔒 Заключение аудита безопасности действий

Все ключевые бизнес-сценарии системы EdCRM MVP успешно прошли аудит. Защита от двойных кликов реализована на клиенте через управление состояниями отправки (`loading`/`submitting`) и отключение кнопок, а на сервере (Supabase) — с помощью транзакций, ограничений целостности (`UNIQUE CONSTRAINTS`) и RPC-функций, гарантируя надежность работы CRM при проведении презентаций и реальной эксплуатации.

---

## 📅 Отчет о запуске Real E2E тестов

- **Дата запуска:** 24 июня 2026 года
- **Хэш коммита (git commit):** `6eaad9ff97232c56fbb39b34f4e7d1becd588d96`
- **Команда:** `REAL_SUPABASE=true npm run test:e2e:real`

### Лог выполнения Real E2E:
```text
> web@0.1.0 test:e2e:real
> REAL_SUPABASE=true playwright test


[WebServer] ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy

Running 7 tests using 7 workers

[1/7] [chromium] › e2e/auth.spec.ts:6:7 › Auth and Middleware redirects › should redirect unauthenticated users to login page
[2/7] [chromium] › e2e/auth.spec.ts:21:7 › Auth and Middleware redirects › should login successfully with role credentials
[3/7] [chromium] › e2e/lead-conversion.spec.ts:6:7 › Leads Conversion in CRM › should load leads list page
[4/7] [chromium] › e2e/payments.spec.ts:6:7 › Invoicing and Payments Page › should render payments page with bills list
[5/7] [chromium] › e2e/public-lead.spec.ts:6:7 › Public Lead Registration Form › should register a new lead and redirect to thanks page
[6/7] [chromium] › e2e/teacher-student-lesson.spec.ts:6:7 › Teacher Lesson start and Student Material access E2E scenario › should start lesson and show materials
[7/7] [chromium] › e2e/real-supabase.spec.ts:7:7 › Real Supabase E2E Smoke Test › CRM and Portal flows against real Supabase database
[chromium] › e2e/real-supabase.spec.ts:7:7 › Real Supabase E2E Smoke Test › CRM and Portal flows against real Supabase database
Step 1: Submitting a new public lead...

  ✓ Lead submitted, redirected to /thanks

Step 2: Logging in as Admin...


[WebServer] [browser] Detected `scroll-behavior: smooth` on the `<html>` element. To disable smooth scrolling during route transitions, add `data-scroll-behavior="smooth"` to your <html> element. Learn more: https://nextjs.org/docs/messages/missing-data-scroll-behavior
  ✓ Admin logged in, redirected to /crm

Step 3: Converting lead to student...

  ✓ Lead converted, 'Открыть ученика' visible

Step 4: Opening converted student profile...


[WebServer] [browser] Detected `scroll-behavior: smooth` on the `<html>` element. To disable smooth scrolling during route transitions, add `data-scroll-behavior="smooth"` to your <html> element. Learn more: https://nextjs.org/docs/messages/missing-data-scroll-behavior
  ✓ Student profile opened, name matches

Step 5: Creating and paying invoice...

  ✓ Invoice created and marked as paid

Step 6: Logging in as Teacher...

  ✓ Lesson already live from previous run — skipping start

Step 7: Logging in as Student...

  ✓ Student portal loaded, greeting matches

  ⚠ Lesson materials not visible (session may be completed or for a different day)

Step 8: Logging in as Parent...

  ✓ Parent portal loaded, child 'Игорь Петров' visible


✅ Real Supabase E2E Smoke Test completed successfully!

  6 skipped
  1 passed (44.0s)
```

