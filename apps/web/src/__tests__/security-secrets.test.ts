import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../..");

function filesUnder(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    return entry.isDirectory() ? filesUnder(absolute) : [absolute];
  });
}

describe("server credential containment", () => {
  it("does not define a public Supabase secret-key variable", () => {
    const trackedConfig = ["Dockerfile", ".env.example", "docker-compose.prod.yml"]
      .map((file) => fs.readFileSync(path.join(repoRoot, file), "utf8"))
      .join("\n");
    expect(trackedConfig).not.toContain("NEXT_PUBLIC_SUPABASE_SECRET_KEY");
  });

  it("does not embed the configured server secret in static client chunks", () => {
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!secret || secret.length < 16) return;
    const staticRoot = path.join(repoRoot, "apps/web/.next/static");
    for (const file of filesUnder(staticRoot)) {
      expect(fs.readFileSync(file)).not.toContain(Buffer.from(secret));
    }
  });
});
