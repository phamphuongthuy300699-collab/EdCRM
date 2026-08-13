import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { guardianSchema } from "../features/clients/contracts";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("client base API contracts", () => {
  it("accepts an independent prospect guardian with CRM metadata", () => {
    expect(guardianSchema.safeParse({ fullName: "Анна", status: "prospect", source: "manual", tags: ["python"], interestNotes: "Осень" }).success).toBe(true);
  });

  it("detects duplicates before inserting unless explicitly confirmed", () => {
    const route = read("src/app/api/crm/guardians/route.ts");
    expect(route.indexOf("DUPLICATE_GUARDIAN_FOUND")).toBeLessThan(route.indexOf(".insert(payload)"));
    expect(route).toContain("allowDuplicate");
  });

  it("allows student creation with no guardian and no group", () => {
    const route = read("src/app/api/crm/students/manage/route.ts");
    expect(route).toContain("guardians: z.array(guardianInputSchema).max(4).default([])");
    expect(route).not.toContain("billingCount !== 1");
    expect(route).toContain('status: input.status || "prospect"');
  });

  it("uses transactional server routes for later links and interactions", () => {
    expect(read("src/app/api/crm/client-relations/route.ts")).toContain('admin.rpc("crm_link_student_guardian"');
    expect(read("src/app/api/crm/interactions/route.ts")).toContain("next_action_completed_at");
    expect(read("src/app/api/crm/followups/route.ts")).toContain('admin.rpc("crm_followup_queue"');
  });

  it("records and completes follow-ups through one tenant-scoped RPC", () => {
    const route = read("src/app/api/crm/interactions/route.ts");
    expect(route).toContain('admin.rpc("crm_record_interaction"');
    expect(route).toContain("p_complete_interaction_id");
    expect(route).not.toContain('.from("lead_interactions").insert');
  });

  it("validates responsible managers inside the organization", () => {
    const route = read("src/app/api/crm/guardians/route.ts");
    expect(route).toContain("validateResponsibleManager");
    expect(route).toContain('eq("organization_id", access.organizationId)');
    expect(route).toContain('eq("is_active", true)');
  });

  it("does not provision Auth identities during CRM person creation", () => {
    const sources = read("src/app/api/crm/guardians/route.ts") + read("src/app/api/crm/students/manage/route.ts");
    expect(sources).not.toContain("auth.admin.createUser");
  });
});
