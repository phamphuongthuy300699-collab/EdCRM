/**
 * Determines if the application is running in demo mode.
 * 
 * Demo mode is allowed ONLY when:
 * 1. NEXT_PUBLIC_DEMO_MODE=true is explicitly set, OR
 * 2. NODE_ENV is NOT "production" AND Supabase env vars are missing
 * 
 * In production without Supabase env vars, demo mode is NOT allowed —
 * this indicates a configuration error.
 */
export function isDemoMode(): boolean {
  // Explicit demo mode flag takes priority
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return true;
  }

  const hasSupabaseConfig = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );

  // In production, we NEVER fall back to demo mode
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  // In development/test, allow demo mode if no Supabase config
  return !hasSupabaseConfig;
}

/**
 * Returns true if Supabase configuration is present and valid.
 */
export function hasSupabaseConfig(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
