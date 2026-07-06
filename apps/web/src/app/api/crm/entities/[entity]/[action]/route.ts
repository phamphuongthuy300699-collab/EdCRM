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

const titleColumns: Partial<Record<LifecycleEntity, string>> = {
  branches: "name",
  rooms: "name",
  courses: "title",
  course_tariffs: "title",
  groups: "title",
  profiles: "full_name",
  students: "full_name",
  guardians: "full_name",
  leads: "parent_name",
  invoices: "title",
  discount_types: "title",
  site_content_blocks: "title",
};

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
  if (error) return 0;
  return count || 0;
}

async function listIds(admin: any, table: string, filters: Record<string, any>) {
  let query = admin.from(table).select("id");
  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) query = query.in(key, value);
    else query = query.eq(key, value);
  });
  const { data, error } = await query;
  if (error) return [];
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
    return {
      groups: await countRows(admin, "groups", { organization_id: organizationId, branch_id: id }),
      rooms: await countRows(admin, "rooms", { organization_id: organizationId, branch_id: id }),
      leads: 0,
      enrollments: 0,
    };
  }

  if (entity === "rooms") {
    return {
      groups: await countRows(admin, "groups", { organization_id: organizationId, room_id: id }),
      lessonSessions: await countRows(admin, "lesson_sessions", { organization_id: organizationId, room_id: id }),
    };
  }

  if (entity === "courses") {
    return {
      groups: await countRows(admin, "groups", { organization_id: organizationId, course_id: id }),
      leads: await countRows(admin, "leads", { organization_id: organizationId, course_id: id }),
      courseTariffs: 0,
      enrollments: 0,
      invoices: 0,
    };
  }

  if (entity === "students") {
    return {
      enrollments: await countRows(admin, "enrollments", { organization_id: organizationId, student_id: id }),
      invoices: await countRows(admin, "invoices", { organization_id: organizationId, student_id: id }),
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
  const auth = await requireLifecycleRole(action, bodyParsed.data.organizationId);
  if (!auth.ok) return auth.response;

  const admin = createSupabaseAdminClient();
  const organizationId = bodyParsed.data.organizationId || auth.organizationId;
  const titleColumn = titleColumns[entity] || "id";
  const { data: record, error: recordError } = await admin
    .from(entity)
    .select(`id, organization_id, ${titleColumn}, status`)
    .eq("id", bodyParsed.data.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (recordError || !record) {
    return NextResponse.json({ ok: false, error: "Запись не найдена в этой организации" }, { status: 404 });
  }

  const lifecycleRecord = record as Record<string, any>;
  const entityTitle = lifecycleRecord[titleColumn] || lifecycleRecord.id;
  if (action === "archive" || action === "restore") {
    const payload = action === "archive"
      ? buildArchivePayload(entity, auth.userId)
      : buildRestorePayload(entity);
    const { error } = await admin.from(entity).update(payload).eq("id", lifecycleRecord.id).eq("organization_id", organizationId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
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
    const { error } = await admin.from(entity).update(payload).eq("id", lifecycleRecord.id).eq("organization_id", organizationId);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    await logAction(admin, { organizationId, actorId: auth.userId, action, entity, entityId: lifecycleRecord.id, entityTitle });
    return NextResponse.json({ ok: true, action, entity, id: lifecycleRecord.id });
  }

  const counts = await dependencyCounts(admin, entity, lifecycleRecord.id, organizationId);
  const safety = evaluateDeleteSafety(entity, lifecycleRecord, counts);
  if (!safety.allowed) {
    return NextResponse.json({ ok: false, error: safety.message, fallbackAction: safety.fallbackAction, dependencyCounts: counts }, { status: 409 });
  }

  if (bodyParsed.data.expectedText && bodyParsed.data.expectedText !== "УДАЛИТЬ" && bodyParsed.data.expectedText !== String(entityTitle)) {
    return NextResponse.json({ ok: false, error: "Контрольный текст не совпадает" }, { status: 400 });
  }

  if (entity === "groups") {
    await admin.from("group_schedule_rules").delete().eq("group_id", lifecycleRecord.id).eq("organization_id", organizationId);
  }

  const { error } = await admin.from(entity).delete().eq("id", lifecycleRecord.id).eq("organization_id", organizationId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  await logAction(admin, { organizationId, actorId: auth.userId, action, entity, entityId: lifecycleRecord.id, entityTitle, metadata: { dependencyCounts: counts } });
  return NextResponse.json({ ok: true, action, entity, id: lifecycleRecord.id });
}
