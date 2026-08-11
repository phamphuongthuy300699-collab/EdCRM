# Backup and restore runbook

Production paths: `/opt/edcrm`, `/opt/supabase`, `/opt/backups`, `/opt/edcrm/media`. Команды адаптируются к фактическому имени PostgreSQL container/database; секреты не помещаются в shell history или имя архива.

## Backup before deploy

1. Создать каталог с timestamp под `/opt/backups/edcrm/` и mode `0700`.
2. Снять consistent PostgreSQL custom-format dump через `pg_dump --format=custom --no-owner --no-acl` внутри trusted Supabase/PostgreSQL network.
3. Создать media archive/snapshot `/opt/edcrm/media`; сохранить владельца, права и относительные пути.
4. Записать отдельно: Git SHA, последний применённый Supabase migration filename, время UTC, размеры файлов и SHA-256 checksums.
5. Проверить, что dump и media archive существуют, non-zero, читаются текущим backup user и checksum совпадает после копирования во второе хранилище.
6. Не считать backup успешным только по exit code scheduler. Настроить alert на пропуск, нулевой размер, checksum/retention failure.

Не использовать `docker system prune`, `docker volume prune` или удаление старого volume как часть backup/deploy.

## Restore drill

Restore проводится в отдельной test DB и отдельном media directory, никогда поверх production.

1. Развернуть совместимую версию PostgreSQL/Supabase без внешнего трафика.
2. Создать пустую test DB и восстановить dump через `pg_restore --clean --if-exists --no-owner --no-acl` только в неё.
3. Распаковать media archive в новый каталог; проверить traversal-safe tool/options, права и count/checksums.
4. Сверить migration HEAD, ключевые counts и referential integrity; запустить finance/security pgTAP и application smoke с тестовыми аккаунтами.
5. Проверить чтение нескольких media objects и атомарные payment/ledger invariants без вызова реального Alfa/MAX.
6. Зафиксировать RPO/RTO, длительность, ошибки и ответственного. После drill test secrets и test DB уничтожаются по отдельной одобренной процедуре.

## Production recovery decision

Перед production restore остановить writes, определить точку восстановления и подтвердить влияние на payments/ledger/MAX outbox. Restore требует отдельного change approval, свежего backup текущего повреждённого состояния и post-restore reconciliation. Автоматический destructive restore этим runbook не разрешён.
