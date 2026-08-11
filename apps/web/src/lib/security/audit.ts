type AuditClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error?: unknown }>;
  };
};

export async function writeSecurityAudit(
  admin: AuditClient,
  input: {
    organizationId: string;
    actorId?: string | null;
    action: string;
    entityTable: string;
    entityId?: string | null;
    requestId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("crm_audit_log").insert({
    organization_id: input.organizationId,
    actor_id: input.actorId || null,
    action: input.action,
    entity_table: input.entityTable,
    entity_id: input.entityId || null,
    metadata: {
      result: "success",
      ...(input.requestId ? { requestId: input.requestId } : {}),
      ...(input.metadata || {}),
    },
  });
  if (error) console.warn("[security]", { scope: "security", event: "audit_write_failed", action: input.action });
}
