# Обработка очереди уведомлений MAX

EdCRM хранит адресные уведомления в `notification_outbox`. Обработчик нужно вызывать каждые пять минут:

```text
POST https://<ваш-домен>/api/jobs/notifications/process
```

Поддерживаются два способа серверной авторизации (значения секретов не сохраняйте в репозитории):

- `Authorization: Bearer <CRON_SECRET>` — для Vercel Cron и совместимых планировщиков;
- `X-Cron-Secret: <NOTIFICATIONS_CRON_SECRET>` — для собственного cron в Docker.

Пример системного cron для Docker-хоста:

```cron
*/5 * * * * curl --fail --silent --show-error --request POST --header 'X-Cron-Secret: <NOTIFICATIONS_CRON_SECRET>' https://<ваш-домен>/api/jobs/notifications/process >/dev/null
```

В контейнере приложения должны быть заданы `NOTIFICATIONS_CRON_SECRET` (или `CRON_SECRET`), URL Supabase и server-side service-role key. После изменения секрета перезапустите контейнер приложения и обновите значение в cron одновременно.

Состояние последних 50 сообщений, повтор неудачной отправки и ручной запуск обработчика доступны в CRM: **Настройки → Боты и уведомления → Очередь уведомлений**.
