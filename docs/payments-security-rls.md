# Анализ безопасности и RLS-политик модуля оплат в EdCRM

В этом документе описывается модель безопасности базы данных Supabase (PostgreSQL) в отношении счетов и платежей.

---

## 👥 Ролевая модель и привилегии

В системе EdCRM права доступа к ресурсам разделены на основе ролей пользователей в организации (таблица `public.org_memberships`) и связей родителей с учениками (`public.student_guardians`).

### 1. Глобальный финансовый доступ
- **Роли**: `owner`, `admin`, `accountant`.
- **Права**: Полный доступ (чтение, создание, обновление, отмена счетов и платежей) в рамках своей организации.
- **Политики RLS**:
  - `invoices_select_finance_members` / `invoices_write_finance_members`
  - `payments_select_finance_members` / `payments_write_finance_members`

### 2. Организационный менеджмент
- **Роли**: `manager`.
- **Права**: Чтение и выставление счетов в рамках своей организации.
- **Политики RLS**: Те же, что и у глобального финансового доступа (в рамках организации).

### 3. Преподаватели (Teacher)
- **Роли**: `teacher`.
- **Права**: **Полностью заблокировано**. Преподаватели не имеют права просматривать реестры счетов и оплат, а также обращаться к финансовым API-маршрутам.
- **Политики RLS**: Проверка роли `teacher` исключена из списков разрешенных ролей во всех финансовых политиках `*_finance_members`.

### 4. Родители / Законные представители (Guardian)
- **Роли**: Внешний доступ (нет членства в организации, связь идет через `guardian_users` и `student_guardians`).
- **Права**: Доступ только к чтению собственных счетов и транзакций по оплате обучения своих детей.
- **Политики RLS**: `invoices_select_as_guardian` и `payments_select_as_guardian`.

---

## 🔒 Анализ защиты RLS для родителей

Для изоляции родительских данных в миграции базы данных настроены строгие политики на уровне строк (Row Level Security).

### 1. Защита счетов (`public.invoices`)

Политика `invoices_select_as_guardian` ограничивает выборку счетов на уровне базы данных:

```sql
create policy "invoices_select_as_guardian"
on public.invoices
for select
to authenticated
using (
  exists (
    select 1 from public.guardian_users gu
    where gu.user_id = (select auth.uid())
      and gu.organization_id = invoices.organization_id
      and gu.guardian_id = invoices.guardian_id
  )
);
```

**Механизм защиты**:
- База данных автоматически сопоставляет идентификатор текущего авторизованного пользователя (`auth.uid()`) с таблицей соответствия пользователей CRM-родителям (`guardian_users`).
- Извлекается уникальный `guardian_id` родителя.
- Запрос возвращает строку из таблицы `invoices` только если `invoices.guardian_id` строго равен `guardian_id` этого родителя.
- **Результат**: Родитель `А` физически не может прочитать счета родителя `Б`, даже если знает или подберет UUID счета (запрос вернет 0 строк).

### 2. Защита транзакций (`public.payments`)

Политика `payments_select_as_guardian` защищает историю оплат:

```sql
create policy "payments_select_as_guardian"
on public.payments
for select
to authenticated
using (
  (student_id is not null and public.is_guardian_of_student(student_id))
  or exists (
    select 1
    from public.invoices i
    where i.id = payments.invoice_id
      and (
        (i.student_id is not null and public.is_guardian_of_student(i.student_id))
        or exists (
          select 1
          from public.guardian_users gu
          where gu.user_id = auth.uid()
            and gu.organization_id = i.organization_id
            and gu.guardian_id = i.guardian_id
        )
      )
  )
);
```

**Механизм защиты**:
- Допускается просмотр платежа, если текущий родитель является официальным опекуном ученика, к которому привязан платеж (`public.is_guardian_of_student(student_id)`).
- Либо если платеж привязан к счету, который выставлен на этого родителя.
- **Результат**: Исключена утечка записей транзакций или платежных ссылок третьим лицам.
