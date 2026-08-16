import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("privileged mutation input allowlists", () => {
  it("uses strict schemas for student, invoice, guardian, bot and teacher mutations", () => {
    const routes = [
      "app/api/crm/students/manage/route.ts",
      "app/api/crm/students/enrollment/route.ts",
      "app/api/crm/students/status/route.ts",
      "app/api/crm/invoices/create/route.ts",
      "app/api/crm/invoices/settle/route.ts",
      "app/api/crm/invoice-payment-links/route.ts",
      "app/api/crm/guardians/route.ts",
      "app/api/crm/guardians/merge/route.ts",
      "app/api/crm/bot-settings/max/queue/route.ts",
    ];
    for (const route of routes) expect(read(route), route).toContain(".strict()");
    expect(read("features/finance/teacher-rate-schema.ts")).toContain(".strict()");
    expect(read("app/api/crm/finance/teacher-rates/route.ts")).toContain("teacherRateSchema.safeParse");
  });
});
