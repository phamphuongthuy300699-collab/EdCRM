import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../types";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder-key";
  return createBrowserClient<Database>(url, key);
}
