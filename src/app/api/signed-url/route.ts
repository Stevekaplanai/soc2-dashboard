import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { path } = await request.json();

  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  if (!adminClient) {
    return NextResponse.json(
      { error: "Server not configured" },
      { status: 500 }
    );
  }

  const { data, error } = await adminClient.storage
    .from("evidence-files")
    .createSignedUrl(path, 300); // 5 minute URL for viewing

  if (error || !data) {
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}