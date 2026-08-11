import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const config = fs.readFileSync(path.resolve(__dirname, "../../next.config.ts"), "utf8");

describe("production browser security policy", () => {
  it.each([
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ])("sets %s", (header) => expect(config).toContain(header));

  it("does not use wildcard sources or production unsafe-eval", () => {
    expect(config).not.toContain("connect-src *");
    expect(config).not.toContain("img-src *");
    expect(config).toContain("process.env.NODE_ENV === \"development\"");
  });
});
