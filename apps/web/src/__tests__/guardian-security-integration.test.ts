import { describe, expect, it } from "vitest";

const runIfDb = process.env.DATABASE_URL ? it : it.skip;

describe("guardian security PostgreSQL smoke", () => {
  runIfDb("revokes SECURITY DEFINER RPC from authenticated and keeps service_role executable", async () => {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
      const result = await client.query(`
        select
          has_function_privilege('authenticated', 'public.crm_create_student_with_guardians(uuid,jsonb,jsonb,uuid)', 'execute') as auth_create,
          has_function_privilege('authenticated', 'public.crm_merge_guardians(uuid,uuid,uuid,uuid)', 'execute') as auth_merge,
          case when exists (select 1 from pg_roles where rolname = 'service_role')
            then has_function_privilege('service_role', 'public.crm_create_student_with_guardians(uuid,jsonb,jsonb,uuid)', 'execute')
            else true
          end as service_create,
          case when exists (select 1 from pg_roles where rolname = 'service_role')
            then has_function_privilege('service_role', 'public.crm_merge_guardians(uuid,uuid,uuid,uuid)', 'execute')
            else true
          end as service_merge
      `);
      expect(result.rows[0]).toEqual({
        auth_create: false,
        auth_merge: false,
        service_create: true,
        service_merge: true,
      });
    } finally {
      await client.end();
    }
  });
});
