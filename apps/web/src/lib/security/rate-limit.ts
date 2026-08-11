import crypto from "node:crypto";

type Window = { count: number; resetAt: number; touchedAt: number };
const windows = new Map<string, Window>();

export function clearRateLimits() {
  windows.clear();
}

export function checkRateLimit(input: { key: string; limit: number; windowMs: number; now?: number; maxKeys?: number }) {
  const now = input.now ?? Date.now();
  const maxKeys = input.maxKeys ?? 5_000;
  for (const [key, value] of windows) if (value.resetAt <= now) windows.delete(key);
  while (windows.size >= maxKeys) {
    const oldest = [...windows.entries()].reduce((left, right) => left[1].touchedAt <= right[1].touchedAt ? left : right);
    windows.delete(oldest[0]);
  }
  const current = windows.get(input.key);
  const window = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + input.windowMs, touchedAt: now }
    : current;
  window.touchedAt = now;
  window.count += 1;
  windows.set(input.key, window);
  const allowed = window.count <= input.limit;
  return { allowed, remaining: Math.max(0, input.limit - window.count), retryAfter: Math.max(1, Math.ceil((window.resetAt - now) / 1000)), size: windows.size };
}

export function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const value = request.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export function rateLimitResponse(result: { retryAfter: number }) {
  return Response.json({ ok: false, error: "Слишком много запросов", code: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": String(result.retryAfter), "Cache-Control": "no-store" } });
}
