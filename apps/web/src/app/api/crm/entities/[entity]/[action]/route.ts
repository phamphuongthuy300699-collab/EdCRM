import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/shared/db/supabase/admin";
import { createSupabaseServerClient } from "@/shared/db/supabase/server";
import {
  buildArchivePayload,
  buildRestorePayload,
  evaluateDeleteSafety,
  roleCanPerformLifecycleAction,
  type LifecycleAction,
  type LifecycleEntity,
} from "@/shared/utils/entity-lifecycle";

const entitySchema = z.enum([
  "branches",
  "rooms",
  "courses",
  "course_tariffs",
  "groups",
  "profiles",
  "students",
  "guardians",
  "leads",
  "invoices",
  "discount_types",
  "discount_assignments",
  "site_content_blocks",
]);
const actionSchema = z.enum(["archive", "restore", "delete", "anonymize"]);
const bodySchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
  expectedText: z.string().optional(),
});

type EntityMetadata = {
  table: LifecycleEntity;
  titleColumn?: string;
  fallbackTitleColumns: string[];
  organizationColumn?: "organization_id";
  hasStatus: boolean;
  supportsArchive: boolean;
  supportsRestore: boolean;
  supportsDelete: boolean;
  supportsAnonymize: boolean;
  orgScopeStrategy: "organization_id" | "org_memberships";
  statusColumn?: string;
  archivedColumn?: string;
  deletedColumn?: string;
};

const entityMetadata: Record<LifecycleEntity, EntityMetadata> = {
  branches: { table: "branches", titleColumn: "name", fallbackTitleColumns: ["name"], organizationColumn: "organization_id", hasStatus: false, supportsArchive: true, supportsRestore: true, supportsDelete: true, supportsAnonymize: false, orgScopeStrategy: "organization_id", archivedColumn: "archived_at" },
  rooms: { table: "rooms", titleColumn: "name", fallbackTitleColumns: ["name"], organizationColumn: "organization_id", hasStatus: false, supportsArchive: true, supportsRestore: true, supportsDelete: true, supportsAnonymize: false, orgScopeStrategy: "organization_id", archivedColumn: "archived_at" },
  courses: { table: "courses", titleColumn: "title", fallbackTitleColumns: ["title", "slug"], organizationColumn: "organization_id", hasStatus: false, supportsArchive: true, supportsRestore: true, supportsDelete: true, supportsAnonymize: false, orgScopeStrategy: "organization_id", archivedColumn: "archived_at" },
  course_tariffs: { table: "course_tariffs", titleColumn: "title", fallbackTitleColumns: ["title"], organizationColumn: "organization_id", hasStatus: false, supportsArchive: true, supportsRestore: true, supportsDelete: true, supportsAnonymize: false, orgScopeStrategy: "organization_id", archivedColumn: "archived_at" },
  groups: { table: "groups", titleColumn: "title", fallbackTitleColumns: ["title"], organizationColumn: "organization_id", hasStatus: true, supportsArchive: true, supportsRestore: true, supportsDelete: true, supportsAnonymize: false, orgScopeStrategy: "organization_id", statusColumn: "status", archivedColumn: "archived_at" },
  profiles: { table: "profiles", titleColumn: "full_name", fallbackTitleColumns: ["full_name", "email"], hasStatus: false, supportsArchive: true, supportsRestore: true, supportsDelete: false, supportsAnonymize: true, orgScopeStrategy: "org_memberships", archivedColumn: "archived_at" },
  students: { table: "students", titleColumn: "full_name", fallbackTitleColumns: ["full_name"], organizationColumn: "organization_id", hasStatus: true, supportsArchive: true, supportsRestore: true, supportsDelete: true, supportsAnonymize: true, orgScopeStrategy: "organization_id", statusColumn: "status", archivedColumn: "archived_at" },
  guardians: { table: "guardians", titleColumn: "full_name", fallbackTitleColumns: ["full_name", "email", "phone"], organizationColumn: "organization_id", hasStatus: false, supportsArchive: true, supportsRestore: true, supportsDelete: true, supportsAnonymize: true, orgScopeStrategy: "organization_id", archivedColumn: "archived_at" },
  leads: { table: "leads", titleColumn: "parent_name", fallbackTitleColumns: ["parent_name", "parent_phone", "child_name"], organizationColumn: "organization_id", hasStatus: true, supportsArchive: true, supportsRestore: true, supportsDelete: true, supportsAnonymize: false, orgScopeStrategy: "organization_id", statusColumn: "status", archivedColumn: "archived_at" },
  invoices: { table: "invoices", titleColumn: "title", fallbackTitleColumns: ["number", "title"], organizationColumn: "organization_id", hasStatus: true, supportsArchive: true, supportsRestore: true, supportsDelete: true, supportsAnonymize: false, orgScopeStrategy: "organization_id", statusColumn: "status", archivedColumn: "archived_at" },
  discount_types: { table: "discount_types", titleColumn: "title", fallbackTitleColumns: ["title", "code"], organizationColumn: "organization_id", hasStatus: false, supportsArchive: true, supportsRestore: true, supportsDelete: true, supportsAnonymize: false, orgScopeStrategy: "organization_id", archivedColumn: "archived_at" },
  discount_assignments: { table: "discount_assignments", fallbackTitleColumns: [], organizationColumn: "organization_id", hasStatus: true, supportsArchive: true, supportsRestore: false, supportsDelete: true, supportsAnonymize: false, orgScopeStrategy: "organization_id", statusColumn: "status", archivedColumn: "archived_at" },
  site_content_blocks: { table: "site_content_blocks", titleColumn: "title", fallbackTitleColumns: ["title", "block_key", "page_slug"], organizationColumn: "organization_id", hasStatus: true, supportsArchive: true, supportsRestore: true, supportsDelete: false, supportsAnonymize: false, orgScopeStrategy: "organization_id", statusColumn: "status", archivedColumn: "archived_at" },
};

function actionIsSupported(metadata: EntityMetadata, action: LifecycleAction) {
  if (action === "archive") return metadata.supportsArchive;
  if (action === "restore") return metadata.supportsRestore;
  if (action === "delete") return metadata.supportsDelete;
  if (action === "anonymize") return metadata.supportsAnonymize;
  return false;
}

function selectColumns(metadata: EntityMetadata) {
  const columns = new Set(["id", ...metadata.fallbackTitleColumns]);
  if (metadata.organizationColumn) columns.add(metadata.organizationColumn);
  if (metadata.hasStatus && metadata.statusColumn) columns.add(metadata.statusColumn);
  return Array.from(columns).join(", ");
}

function titleFor(record: Record<string, any>, metadata: EntityMetadata) {
  const keys = [
    metadata.titleColumn,
    ...metadata.fallbackTitleColumns,
  ].filter(Boolean) as string[];
  for (const key of keys) {
    const value = record[key];
    if (value) return String(value);
  }
  return String(record.id);
}

async function requireLifecycleRole(action: LifecycleAction, preferredOrganizationId?: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Необходима авторизация" }, { status: 401 }),
    };
  }

  let query = (supabase.from("org_memberships") as any)
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true);
  if (preferredOrganizationId) query = query.eq("organization_id", preferredOrganizationId);

  const { data: membership } = await query.maybeSingle();
  if (!membership || !roleCanPerformLifecycleAction(membership.role, action)) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Недостаточно прав для операции" }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    userId: user.id,
    role: membership.role as string,
    organizationId: membership.organization_id as string,
  };
}

async function countRows(admin: any, table: string, filters: Record<string, any>) {
  let query = admin.from(table).select("id", { count: "exact", head: true });
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) query = query.in(key, value);
    else query = query.eq(key, value);
  });
  const { count, error } = await query;
  if (error) throw new Error(`Не удалось проверить зависимости (${table}): ${error.message || "ошибка запроса"}`);
  return count || 0;
}

async function listIds(admin: any, table: string, filters: Record<string, any>) {
  let query = admin.from(table).select("id");
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) query = query.in(key, value);
    else query = query.eq(key, value);
  });
  const { data, error } = await query;
  if (error) throw new Error(`Не удалось проверить зависимости (${table}): ${error.message || "ошибка запроса"}`);
  return (data || []).map((row: { id: string }) => row.id).filter(Boolean);
}

async function dependencyCounts(admin: any, entity: LifecycleEntity, id: string, organizationId: string) {
  if (entity === "groups") {
    const enrollmentIds = await listIds(admin, "enrollments", { organization_id: organizationId, group_id: id });
    return {
      activeEnrollments: await countRows(admin, "enrollments", { organization_id: organizationId, group_id: id, status: "active" }),
      lessonSessions: await countRows(admin, "lesson_sessions", { organization_id: organizationId, group_id: id }),
      attendance: await countRows(admin, "attendance", { organization_id: organizationId, group_id: id }),
      invoices: enrollmentIds.length > 0
        ? await countRows(admin, "invoices", { organization_id: organizationId, enrollment_id: enrollmentIds })
        : 0,
      homeworkAssignments: await countRows(admin, "homework_assignments", { organization_id: organizationId, group_id: id }),
    };
  }

  if (entity === "branches") {
    const groupIds = await listIds(admin, "groups", { organization_id: organizationId, branch_id: id });
    return {
      groups: groupIds.length,
      rooms: await countRows(admin, "rooms", { organization_id: organizationId, branch_id: id }),
      leads: 0,
      enrollments: groupIds.length > 0
        ? await countRows(admin, "enrollments", { organization_id: organizationId, group_id: groupIds })
        : 0,
    };
  }

  if (entity === "rooms") {
    return {
      groups: await countRows(admin, "groups", { organization_id: organizationId, room_id: id }),
      lessonSessions: await countRows(admin, "lesson_sessions", { organization_id: organizationId, room_id: id }),
    };
  }

  if (entity === "courses") {
    const groupIds = await listIds(admin, "groups", { organization_id: organizationId, course_id: id });
    const enrollmentIds = groupIds.length > 0
      ? await listIds(admin, "enrollments", { organization_id: organizationId, group_id: groupIds })
      : [];
    return {
      groups: groupIds.length,
      leads: await countRows(admin, "leads", { organization_id: organizationId, course_id: id }),
      courseTariffs: 0,
      enrollments: enrollmentIds.length,
      invoices: enrollmentIds.length > 0
        ? await countRows(admin, "invoices", { organization_id: organizationId, enrollment_id: enrollmentIds })
        : 0,
    };
  }

  if (entity === "students") {
    const enrollmentIds = await listIds(admin, "enrollments", { organization_id: organizationId, student_id: id });
    return {
      enrollments: await countRows(admin, "enrollments", { organization_id: organizationId, student_id: id }),
      invoices: enrollmentIds.length > 0
        ? await countRows(admin, "invoices", { organization_id: organizationId, enrollment_id: enrollmentIds })
        : 0,
      payments: await countRows(admin, "payments", { organization_id: organizationId, student_id: id }),
      attendance: await countRows(admin, "attendance", { organization_id: organizationId, student_id: id }),
      lessonSessions: 0,
      homeworkAssignments: 0,
    };
  }

  if (entity === "guardians") {
    return {
      students: await countRows(admin, "student_guardians", { organization_id: organizationId, guardian_id: id }),
      invoices: await countRows(admin, "invoices", { organization_id: organizationId, guardian_id: id }),
      payments: await countRows(admin, "payments", { organization_id: organizationId, guardian_id: id }),
    };
  }

  if (entity === "invoices") {
    return {
      payments: await countRows(admin, "payments", { organization_id: organizationId, invoice_id: id }),
      paymentEvents: await countRows(admin, "payment_events", { organization_id: organizationId, invoice_id: id }),
    };
  }

  if (entity === "discount_types") {
    return {
      assignments: await countRows(admin, "discount_assignments", { organization_id: organizationId, discount_type_id: id }),
      invoiceDiscounts: 0,
    };
  }

  return {};
}

async function logAction(admin: any, input: {
  organizationId: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  entityTitle?: string | null;
  metadata?: Record<string, any>;
}) {
  await admin.from("crm_audit_log").insert({
    organization_id: input.organizationId,
    actor_id: input.actorId,
    action: input.action,
    entity_table: input.entity,
    entity_id: input.entityId,
    entity_title: input.entityTitle || null,
    metadata: input.metadata || {},
  });
}

async function getScopedRecord(admin: any, metadata: EntityMetadata, id: string, organizationId: string) {
  if (metadata.orgScopeStrategy === "org_memberships") {
    const { data: membership, error: membershipError } = await admin
      .from("org_memberships")
      .select("id, organization_id, user_id, role, is_active")
      .eq("organization_id", organizationId)
      .eq("user_id", id)
      .maybeSingle();
    if (membershipError || !membership) return { record: null, error: membershipError };

    const { data: profile, error: profileError } = await admin
      .from(metadata.table)
      .select(selectColumns(metadata))
      .eq("id", id)
      .maybeSingle();
    return { record: profile ? { ...profile, organization_id: organizationId, org_membership_id: membership.id } : null, error: profileError };
  }

  let query = admin
    .from(metadata.table)
    .select(selectColumns(metadata))
    .eq("id", id);
  if (metadata.organizationColumn) query = query.eq(metadata.organizationColumn, organizationId);
  const { data, error } = await query.maybeSingle();
  return { record: data, error };
}

function mutationQuery(admin: any, metadata: EntityMetadata, id: string, organizationId: string, operation: "update" | "delete", payload?: Record<string, any>) {
  let query = operation === "update"
    ? admin.from(metadata.table).update(payload)
    : admin.from(metadata.table).delete();
  query = query.eq("id", id);
  if (metadata.organizationColumn) query = query.eq(metadata.organizationColumn, organizationId);
  return query;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ entity: string; action: string }> },
) {
  const params = await context.params;
  const entityParsed = entitySchema.safeParse(params.entity);
  const actionParsed = actionSchema.safeParse(params.action);
  if (!entityParsed.success || !actionParsed.success) {
    return NextResponse.json({ ok: false, error: "Неизвестная операция CRM" }, { status: 404 });
  }

  const bodyParsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!bodyParsed.success) {
    return NextResponse.json({ ok: false, error: "Некорректные параметры операции" }, { status: 400 });
  }

  const entity = entityParsed.data as LifecycleEntity;
  const action = actionParsed.data as LifecycleAction;
  const metadata = entityMetadata[entity];
  if (!actionIsSupported(metadata, action)) {
    return NextResponse.json({ ok: false, error: "Операция не поддерживается для этой сущности" }, { status: 400 });
  }

  const auth = await requireLifecycleRole(action, bodyParsed.data.organizationId);
  if (!auth.ok) return auth.response;

  const admin = createSupabaseAdminClient();
  const organizationId = bodyParsed.data.organizationId || auth.organizationId;
  const { record, error: recordError } = await getScopedRecord(admin, metadata, bodyParsed.data.id, organizationId);

  if (recordError || !record) {
    return NextResponse.json({ ok: false, error: "Запись не найдена в этой организации" }, { status: 404 });
  }

  const lifecycleRecord = record as Record<string, any>;
  const entityTitle = titleFor(lifecycleRecord, metadata);
  if (action === "archive" || action === "restore") {
    const payload = action === "archive"
      ? buildArchivePayload(entity, auth.userId)
      : buildRestorePayload(entity);
    const { error } = await mutationQuery(admin, metadata, lifecycleRecord.id, organizationId, "update", payload);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    if (entity === "profiles") {
      await admin
        .from("org_memberships")
        .update({ is_active: action === "restore" })
        .eq("organization_id", organizationId)
        .eq("user_id", lifecycleRecord.id);
    }
    await logAction(admin, { organizationId, actorId: auth.userId, action, entity, entityId: lifecycleRecord.id, entityTitle });
    return NextResponse.json({ ok: true, action, entity, id: lifecycleRecord.id });
  }

  if (action === "anonymize") {
    let payload: Record<string, any> | null = null;
    if (entity === "students") {
      payload = {
        full_name: `Удаленный ученик ${lifecycleRecord.id.slice(0, 8)}`,
        birth_date: null,
        notes: null,
        status: "archived",
        anonymized_at: new Date().toISOString(),
        anonymized_by: auth.userId,
      };
    } else if (entity === "guardians") {
      payload = {
        full_name: `Удаленный родитель ${lifecycleRecord.id.slice(0, 8)}`,
        phone: null,
        email: null,
        telegram_username: null,
        max_contact: null,
        notes: null,
        anonymized_at: new Date().toISOString(),
        anonymized_by: auth.userId,
      };
    } else if (entity === "profiles") {
      payload = {
        phone: null,
        email: null,
        avatar_url: null,
        public_bio: null,
        specialty: null,
        show_on_site: false,
        personal_data_cleared_at: new Date().toISOString(),
        personal_data_cleared_by: auth.userId,
      };
    }
    if (!payload) return NextResponse.json({ ok: false, error: "Для этой сущности очистка персональных данных не поддерживается" }, { status: 400 });
    const { error } = await mutationQuery(admin, metadata, lifecycleRecord.id, organizationId, "update", payload);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    await logAction(admin, { organizationId, actorId: auth.userId, action, entity, entityId: lifecycleRecord.id, entityTitle });
    return NextResponse.json({ ok: true, action, entity, id: lifecycleRecord.id });
  }

  let counts: Record<string, number | undefined>;
  try {
    counts = await dependencyCounts(admin, entity, lifecycleRecord.id, organizationId);
  } catch (err: any) {
    const message = err.message || "Не удалось проверить зависимости. Удаление заблокировано.";
    await logAction(admin, {
      organizationId,
      actorId: auth.userId,
      action: "delete_blocked",
      entity,
      entityId: lifecycleRecord.id,
      entityTitle,
      metadata: { reason: "dependency_check_error", message },
    });
    return NextResponse.json({ ok: false, error: message, fallbackAction: "archive" }, { status: 409 });
  }
  const safety = evaluateDeleteSafety(entity, lifecycleRecord, counts);
  if (!safety.allowed) {
    await logAction(admin, {
      organizationId,
      actorId: auth.userId,
      action: "delete_blocked",
      entity,
      entityId: lifecycleRecord.id,
      entityTitle,
      metadata: { reason: "dependency_check_blocked", dependencyCounts: counts },
    });
    return NextResponse.json({ ok: false, error: safety.message, fallbackAction: safety.fallbackAction, dependencyCounts: counts }, { status: 409 });
  }

  if (bodyParsed.data.expectedText && bodyParsed.data.expectedText !== "УДАЛИТЬ" && bodyParsed.data.expectedText !== String(entityTitle)) {
    return NextResponse.json({ ok: false, error: "Контрольный текст не совпадает" }, { status: 400 });
  }

  if (entity === "groups") {
    await admin.from("group_schedule_rules").delete().eq("group_id", lifecycleRecord.id).eq("organization_id", organizationId);
  }

  const { error } = await mutationQuery(admin, metadata, lifecycleRecord.id, organizationId, "delete");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  await logAction(admin, { organizationId, actorId: auth.userId, action, entity, entityId: lifecycleRecord.id, entityTitle, metadata: { dependencyCounts: counts } });
  return NextResponse.json({ ok: true, action, entity, id: lifecycleRecord.id });
}
