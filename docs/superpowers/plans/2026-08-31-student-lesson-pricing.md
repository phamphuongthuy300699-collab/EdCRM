# Per-student lesson pricing implementation plan

> Scope: replace the group-level lesson debit amount with a per-student amount while preserving group billing switches, absence rules, immutable ledger history, and all existing education data.

1. Add regression coverage before implementation.
   - pgTAP: student price schema, validation, individual debits in one group, missing-price warning and reconciliation, immutable historical debit.
   - Vitest contracts: all CRM student-creation paths submit a price, the student edit form persists it, and finance warnings link to the student.
   - Update existing finance fixtures so their expected amounts remain explicit per student.
2. Add one forward-only migration after `20260831000002`.
   - Add nullable `students.lesson_price numeric(12,2)` with a positive-value constraint.
   - Backfill only when all active group enrollments agree on one non-null legacy group price; never invent a value.
   - Replace the current student-creation, lead-conversion, lesson-completion, and reconciliation functions without weakening their existing transactional, tenant, attendance, makeup, payroll, or privilege semantics.
   - Keep the legacy group column for rolling compatibility, but stop using it for new debit calculations.
3. Update CRM surfaces minimally.
   - Require price in manual student creation, guardian-to-child creation, and lead conversion.
   - Show and edit price in the existing student profile modal.
   - Remove the obsolete group price input while retaining group-level billing enablement and absence policies.
   - Point missing-price finance warnings to the affected student card.
4. Verify locally.
   - `git diff --check`, fresh Supabase reset, all pgTAP, focused and full unit tests, lint, build, and focused Playwright where available.
   - Review the final diff for unrelated changes and privilege regressions.
5. Release safely.
   - Commit and push the feature branch, fast-forward `main` only if its remote head is unchanged, and push.
   - On production: backup DB, capture pre-deploy counts, pull `main`, apply only the new migration in a single transaction, rebuild/restart the web service, capture post-deploy counts, run DB and HTTP smoke checks, and inspect logs.
