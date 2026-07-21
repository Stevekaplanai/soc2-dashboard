import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/", request.url), {
    status: 302,
  });
}