import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { mapTrialRpcError } from "../features/trials/server";

const read = (file: string) =>
  fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("trial API security and transaction boundary", () => {
  it("creates a whole trial batch only through the service-only RPC", () => {
    const route = read("src/app/api/crm/trials/route.ts");
    expect(route).toContain("requireCrmStaff(crmMutationRoles)");
    expect(route).toContain("trialCreateSchema.safeParse");
    expect(route).toContain('admin.rpc("crm_create_trial_event"');
    expect(route).toContain("p_organization_id: access.organizationId");
    expect(route).toContain("p_actor_id: access.staffProfileId");
    expect(route).not.toContain('.from("trial_events").insert');
    expect(route).not.toContain("organizationId:");
  });

  it("updates event and participant state through dedicated transactional RPCs", () => {
    const eventRoute = read("src/app/api/crm/trials/[trialId]/route.ts");
    const participantRoute = read(
      "src/app/api/crm/trials/participants/[participantId]/route.ts",
    );
    expect(eventRoute).toContain('admin.rpc("crm_update_trial_event"');
    expect(eventRoute).toContain("requireCrmStaff(crmMutationRoles)");
    expect(participantRoute).toContain("admin.rpc(");
    expect(participantRoute).toContain('"crm_record_trial_participant_result"');
    expect(participantRoute).toContain(
      '"owner", "admin", "manager", "teacher"',
    );
    expect(participantRoute).not.toContain(
      '.from("trial_participants").update',
    );
  });

  it("loads only tenant-scoped live picker options", () => {
    const route = read("src/app/api/crm/trials/options/route.ts");
    expect(route).toContain('.eq("organization_id", access.organizationId)');
    expect(route).toContain('.is("deleted_at", null)');
    expect(route).toContain('.eq("is_active", true)');
    expect(route).toContain('.in("status", ["planned", "live"])');
    expect(route).toContain('role", "teacher"');
    expect(route).toContain("isoDateOffset(14)");
    expect(route).toContain("remainingCapacity");
  });
});

describe("safe trial RPC errors", () => {
  it.each([
    [
      "trial_capacity_exceeded",
      409,
      "TRIAL_CAPACITY_EXCEEDED",
      "Нет свободных мест",
    ],
    ["trial_slot_conflict", 409, "TRIAL_SLOT_CONFLICT", "Время занято"],
    ["trial_subject_duplicate", 409, "TRIAL_SUBJECT_DUPLICATE", "уже добавлен"],
    [
      "trial_subject_already_occupies_session",
      409,
      "TRIAL_SUBJECT_ALREADY_OCCUPIES_SESSION",
      "уже занимает место",
    ],
    ["trial_forbidden", 403, "TRIAL_FORBIDDEN", "Недостаточно прав"],
  ])(
    "maps %s without exposing SQL internals",
    (message, status, code, safeText) => {
      const mapped = mapTrialRpcError({
        message: `${message}\nCONTEXT: private SQL stack`,
      });
      expect(mapped.status).toBe(status);
      expect(mapped.body.code).toBe(code);
      expect(mapped.body.error).toContain(safeText);
      expect(mapped.body.error).not.toContain("CONTEXT");
    },
  );

  it("uses a generic message for unknown database errors", () => {
    expect(
      mapTrialRpcError({ message: "relation secret_table failed" }),
    ).toEqual({
      status: 500,
      body: {
        ok: false,
        code: "TRIAL_OPERATION_FAILED",
        error: "Не удалось выполнить операцию с пробным занятием",
      },
    });
  });

  it("returns the authoritative remaining seat count without SQL details", () => {
    expect(
      mapTrialRpcError({
        message: "trial_capacity_exceeded:1\nCONTEXT: private",
      }),
    ).toEqual({
      status: 409,
      body: {
        ok: false,
        code: "TRIAL_CAPACITY_EXCEEDED",
        error: "В занятии доступно только 1 место",
      },
    });
  });
});
