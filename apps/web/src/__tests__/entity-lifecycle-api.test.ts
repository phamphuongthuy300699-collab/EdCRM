import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/crm/entities/[entity]/[action]/route";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";

vi.mock("@/shared/db/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/shared/db/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

const orgId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const recordId = "33333333-3333-4333-8333-333333333333";

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/crm/entities/test/action", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function params(entity: string, action: string) {
  return { params: Promise.resolve({ entity, action }) };
}

function authClient(role = "admin") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { organization_id: orgId, role } }),
    })),
  };
}

type Scenario = {
  records?: Record<string, any>;
  counts?: Record<string, number>;
  countErrors?: Record<string, string>;
};

function lifecycleAdminClient(scenario: Scenario) {
  const operations: Array<{ table: string; operation: string; payload?: any; filters?: Record<string, any> }> = [];

  const makeQuery = (table: string) => {
    const state = {
      table,
      operation: "select",
      columns: "",
      payload: undefined as any,
      filters: {} as Record<string, any>,
      count: false,
    };

    const query: any = {
      select(columns: string, options?: { count?: string; head?: boolean }) {
        state.operation = "select";
        state.columns = columns;
        state.count = Boolean(options?.count);
        return query;
      },
      update(payload: any) {
        state.operation = "update";
        state.payload = payload;
        return query;
      },
      delete() {
        state.operation = "delete";
        return query;
      },
      insert(payload: any) {
        operations.push({ table, operation: "insert", payload });
        return Promise.resolve({ error: null });
      },
      eq(column: string, value: any) {
        state.filters[column] = value;
        return query;
      },
      in(column: string, value: any[]) {
        state.filters[column] = value;
        return query;
      },
      maybeSingle() {
        if (state.columns.includes("status") && !["groups", "students", "leads", "invoices", "discount_assignments", "site_content_blocks"].includes(table)) {
          return Promise.resolve({ data: null, error: { message: `column ${table}.status does not exist` } });
        }
        if (table === "profiles" && "organization_id" in state.filters) {
          return Promise.resolve({ data: null, error: { message: "column profiles.organization_id does not exist" } });
        }
        return Promise.resolve({ data: scenario.records?.[table] || { id: recordId, organization_id: orgId }, error: null });
      },
      then(resolve: any) {
        if (state.count) {
          const errorMessage = scenario.countErrors?.[table];
          if (errorMessage) return Promise.resolve({ count: null, error: { message: errorMessage } }).then(resolve);
          return Promise.resolve({ count: scenario.counts?.[table] || 0, error: null }).then(resolve);
        }
        operations.push({ table, operation: state.operation, payload: state.payload, filters: state.filters });
        if (state.operation === "update" || state.operation === "delete") {
          return Promise.resolve({ error: null }).then(resolve);
        }
        const rows = scenario.records?.[table] ? [scenario.records[table]] : [];
        return Promise.resolve({ data: rows, error: null }).then(resolve);
      },
    };

    return query;
  };

  return {
    operations,
    client: {
      from: vi.fn((table: string) => makeQuery(table)),
    },
  };
}

describe("CRM lifecycle API safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(authClient() as any);
  });

  it("archives a branch without selecting a missing status column", async () => {
    const admin = lifecycleAdminClient({ records: { branches: { id: recordId, organization_id: orgId, name: "Main" } } });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(admin.client as any);

    const response = await POST(request({ id: recordId, organizationId: orgId }), params("branches", "archive"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ ok: true, action: "archive", entity: "branches" });
    expect(admin.operations).toContainEqual(expect.objectContaining({
      table: "branches",
      operation: "update",
      payload: expect.objectContaining({ is_active: false, show_on_site: false }),
    }));
  });

  it("archives a course tariff without selecting a missing status column", async () => {
    const admin = lifecycleAdminClient({ records: { course_tariffs: { id: recordId, organization_id: orgId, title: "Base" } } });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(admin.client as any);

    const response = await POST(request({ id: recordId, organizationId: orgId }), params("course_tariffs", "archive"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ ok: true, action: "archive", entity: "course_tariffs" });
  });

  it("anonymizes a profile through org_memberships scope instead of profiles.organization_id", async () => {
    const admin = lifecycleAdminClient({
      records: {
        profiles: { id: recordId, full_name: "Teacher", email: "teacher@example.com" },
        org_memberships: { id: "membership-1", organization_id: orgId, user_id: recordId, role: "teacher" },
      },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(admin.client as any);

    const response = await POST(request({ id: recordId, organizationId: orgId }), params("profiles", "anonymize"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({ ok: true, action: "anonymize", entity: "profiles" });
    expect(admin.operations).toContainEqual(expect.objectContaining({
      table: "profiles",
      operation: "update",
      filters: expect.objectContaining({ id: recordId }),
      payload: expect.objectContaining({ email: null, show_on_site: false }),
    }));
  });

  it("blocks hard delete when dependency checks fail and does not log successful delete", async () => {
    const admin = lifecycleAdminClient({
      records: { groups: { id: recordId, organization_id: orgId, title: "Draft", status: "draft" } },
      countErrors: { enrollments: "permission denied for enrollments" },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(admin.client as any);

    const response = await POST(request({ id: recordId, organizationId: orgId, expectedText: "УДАЛИТЬ" }), params("groups", "delete"));
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.error).toContain("Не удалось проверить зависимости");
    expect(admin.operations.some((op) => op.table === "groups" && op.operation === "delete")).toBe(false);
    expect(admin.operations).toContainEqual(expect.objectContaining({
      table: "crm_audit_log",
      operation: "insert",
      payload: expect.objectContaining({ action: "delete_blocked" }),
    }));
    expect(admin.operations).not.toContainEqual(expect.objectContaining({
      table: "crm_audit_log",
      operation: "insert",
      payload: expect.objectContaining({ action: "delete" }),
    }));
  });

  it("deletes a draft group without dependencies", async () => {
    const admin = lifecycleAdminClient({
      records: { groups: { id: recordId, organization_id: orgId, title: "Draft", status: "draft" } },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(admin.client as any);

    const response = await POST(request({ id: recordId, organizationId: orgId, expectedText: "УДАЛИТЬ" }), params("groups", "delete"));

    expect(response.status).toBe(200);
    expect(admin.operations).toContainEqual(expect.objectContaining({
      table: "groups",
      operation: "delete",
      filters: expect.objectContaining({ id: recordId, organization_id: orgId }),
    }));
  });

  it("blocks active group delete when educational or financial links exist", async () => {
    const admin = lifecycleAdminClient({
      records: { groups: { id: recordId, organization_id: orgId, title: "Active", status: "active" } },
      counts: { enrollments: 1, invoices: 1 },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(admin.client as any);

    const response = await POST(request({ id: recordId, organizationId: orgId, expectedText: "УДАЛИТЬ" }), params("groups", "delete"));
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.fallbackAction).toBe("archive");
    expect(admin.operations.some((op) => op.table === "groups" && op.operation === "delete")).toBe(false);
  });

  it("blocks student hard delete when enrollments invoices or payments exist", async () => {
    const admin = lifecycleAdminClient({
      records: { students: { id: recordId, organization_id: orgId, full_name: "Student", status: "active" } },
      counts: { enrollments: 1, invoices: 1, payments: 1 },
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(admin.client as any);

    const response = await POST(request({ id: recordId, organizationId: orgId, expectedText: "УДАЛИТЬ" }), params("students", "delete"));
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json.fallbackAction).toBe("anonymize");
    expect(admin.operations.some((op) => op.table === "students" && op.operation === "delete")).toBe(false);
  });
});
