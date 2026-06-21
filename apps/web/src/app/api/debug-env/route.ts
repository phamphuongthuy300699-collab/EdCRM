import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT_SET",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY_SET: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY_SET: !!process.env.SUPABASE_SECRET_KEY,
    NODE_ENV: process.env.NODE_ENV
  });
}
