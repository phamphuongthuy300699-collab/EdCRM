import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "..");
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

describe("public error disclosure", () => {
  it("does not return storage, database or provider error text from public surfaces", () => {
    const media = read("app/api/crm/media/route.ts");
    const publicPayment = read("app/api/payments/public-link/create/route.ts");
    expect(media).not.toContain('NextResponse.json({ error: err.message');
    expect(publicPayment).not.toContain('"Не удалось создать запись платежа: "');
    expect(publicPayment).not.toContain("jsonError(alfaErrorMessage(error)");
  });
});
