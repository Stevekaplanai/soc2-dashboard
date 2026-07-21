import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReviewQueueClient } from "@/components/review-queue-client";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function getPendingEvidence() {
  const supabase = await createClient();
  if (!supabase) return { evidence: [], isAdmin: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/dashboard/review");
  }

  const userRole = user.app_metadata?.role || user.user_metadata?.role;
  const isAdmin = userRole === "admin";

  if (!isAdmin) {
    return { evidence: [], isAdmin: false };
  }

  // Fetch pending evidence with control info
  const { data: evidence } = await supabase
    .from("evidence")
    .select(
      `
      id,
      control_id,
      file_url,
      file_name,
      uploaded_by,
      uploaded_at,
      ai_proposed_controls,
      ai_confidence,
      review_status,
      notes,
      control:controls(code, title),
      uploader:auth.users!evidence_uploaded_by_fkey(email)
    `
    )
    .eq("review_status", "pending")
    .order("uploaded_at", { ascending: true });

  // Flatten the joined data
  const flatEvidence = (evidence || []).map((e: any) => ({
    ...e,
    control_code: e.control?.code,
    control_title: e.control?.title,
    uploader_email: e.uploader?.email,
  }));

  return { evidence: flatEvidence, isAdmin: true };
}

export default async function ReviewPage() {
  const { evidence, isAdmin } = await getPendingEvidence();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-neutral-900" />
              <span className="font-semibold">Review Queue</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">Evidence Review Queue</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Review uploaded evidence, check Claude's AI proposals, and accept or reject.
          </p>
        </div>

        {!isAdmin ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-neutral-500">
                Admin access required. Set the{" "}
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm">
                  admin
                </code>{" "}
                role in your user metadata to access this page.
              </p>
              <p className="mt-2 text-xs text-neutral-400">
                Run in Supabase SQL editor:
                <code className="mt-1 block rounded bg-neutral-100 p-2 text-xs">
                  UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data ||
                  '{"{"}"role":"admin"{"}"}' WHERE email = 'your@email.com';
                </code>
              </p>
            </CardContent>
          </Card>
        ) : evidence.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-neutral-500">
                No pending evidence. All caught up! 🎉
              </p>
            </CardContent>
          </Card>
        ) : (
          <ReviewQueueClient evidence={evidence} />
        )}
      </main>
    </div>
  );
}