import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isMaxEventEnabled, normalizeMaxEvents } from "@/lib/bots/max/events";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("MAX notification controls", () => {
  it("keeps existing installations enabled by default and honors explicit opt-out", () => {
    expect(normalizeMaxEvents(undefined).lesson_rescheduled).toBe(true);
    expect(isMaxEventEnabled({ events: { lesson_rescheduled: false } }, "lesson_rescheduled")).toBe(false);
  });

  it("gates enqueue, self-service and invoice delivery without changing payment construction", () => {
    expect(read("src/features/scheduling/server.ts")).toContain("isMaxEventEnabled");
    expect(read("src/app/api/bots/max/webhook/route.ts")).toContain('"self_service_schedule"');
    expect(read("src/lib/payments/publish-invoice.ts")).toContain('"invoice_payment_link"');
  });

  it("supports explicit notification choices and retries the same outbox row", () => {
    const schedule = read("src/app/api/crm/schedule/route.ts");
    expect(schedule).toContain("notifyGuardians");
    const queue = read("src/app/api/crm/bot-settings/max/queue/route.ts");
    expect(queue).toContain('.eq("id", parsed.data.id)');
    expect(queue).toContain('status: "pending"');
    expect(queue).not.toContain(".insert(");
  });
});
