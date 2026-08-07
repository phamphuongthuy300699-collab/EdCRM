# Teacher access verification scenario

Use only disposable test identities. Do not commit temporary passwords, tokens, production email addresses, or screenshots containing personal data.

1. In CRM Settings → Staff, create a staff record with role `teacher` and a test email controlled by the tester.
2. Copy the one-time temporary password outside the repository and sign in in a private browser profile.
3. Confirm the identity chain uses one account: `auth.users.id = profiles.id/user_id → org_memberships.user_id` with the active membership role `teacher`.
4. In CRM Settings → Groups, assign that staff member as the group teacher. Confirm `groups.teacher_id` equals the same auth user id.
5. Materialize the group schedule and confirm generated `lesson_sessions.teacher_id` equals the same id.
6. Sign in as the teacher and open `/teacher`. Confirm only that teacher's sessions are returned; an attempt to request another session id must return HTTP 403.
7. Start a planned session, save a fully marked attendance roster, and complete it. Confirm the same `lesson_sessions` row transitions `planned → live → completed`; no extra session is inserted.
8. From Settings → Staff, verify reset-password returns a new one-time password and deactivate access. Confirm the inactive membership can no longer enter the teacher portal.

Expected staff flow already used by CRM: create, reset password, deactivate, and group assignment all operate on `profiles` and `org_memberships`; no parallel teacher-account entity is introduced.
