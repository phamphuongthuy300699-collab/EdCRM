import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const read = (relative: string) => fs.readFileSync(path.resolve(process.cwd(), relative), "utf8");

describe("MAX schedule notifications", () => {
  it("dispatches schedule templates through the existing outbox without a payment button", () => {
    const worker = read("src/app/api/jobs/notifications/process/route.ts");
    expect(worker).toContain("buildScheduleNotificationText");
    expect(worker).toContain('["pay_invoice", "invoice_payment_link"]');
    expect(worker).toContain("const message = isInvoice ?");
    expect(worker).toContain("text: buildScheduleNotificationText");
    expect(worker).toContain("attempt_count");
    expect(worker).toContain("next_attempt_at");
    expect(worker).toContain('attempts >= 3 ? "failed" : "pending"');
  });

  it("runs automatically through an authenticated Vercel cron", () => {
    const worker = read("src/app/api/jobs/notifications/process/route.ts");
    const utils = read("src/lib/bots/max/utils.ts");
    const vercel = read("../../vercel.json");
    expect(worker).toContain("export async function GET");
    expect(utils).toContain("process.env.CRON_SECRET");
    expect(utils).toContain("`Bearer ${vercelCronSecret}`");
    expect(vercel).toContain('"path": "/api/jobs/notifications/process"');
    expect(vercel).toContain('"schedule": "*/5 * * * *"');
  });
});
