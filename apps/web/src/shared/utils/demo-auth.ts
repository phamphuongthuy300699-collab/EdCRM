/** Server-only demo authorization bypass. Never import this into client components. */
export function isDemoAuthBypassAllowed(): boolean {
  if (process.env.DEMO_AUTH_BYPASS !== "true") return false;
  if (process.env.VERCEL_ENV === "preview") return true;
  return process.env.NODE_ENV !== "production";
}
