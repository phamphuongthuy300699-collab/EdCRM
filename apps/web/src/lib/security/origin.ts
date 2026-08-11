type OriginResult = { ok: true } | { ok: false; status: 403; code: "CSRF_ORIGIN_REJECTED" };

export function assertSameOriginMutation(request: Request, configuredAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || ""): OriginResult {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) return { ok: true };
  const expected = new URL(configuredAppUrl || request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === expected ? { ok: true } : { ok: false, status: 403, code: "CSRF_ORIGIN_REJECTED" };
    } catch {
      return { ok: false, status: 403, code: "CSRF_ORIGIN_REJECTED" };
    }
  }
  const site = request.headers.get("sec-fetch-site");
  return site === "same-origin"
    ? { ok: true }
    : { ok: false, status: 403, code: "CSRF_ORIGIN_REJECTED" };
}
