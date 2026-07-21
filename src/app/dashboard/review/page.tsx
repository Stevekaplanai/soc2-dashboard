import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { ReviewQueueClient } from "@/components/review-queue-client";
import { Card, CardContent } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AiProposedControl, Evidence } from "@/lib/types";

export const dynamic = "force-dynamic";

type PendingEvidenceRow = Omit<
  Evidence,
  "control_code" | "control_title" | "uploader_email"
> & {
  control: Array<{ code: string; title: string }>;
};

async function getPendingEvidence() {
  const supabase = await createClient();
  if (!supabase) return { evidence: [] as Evidence[], isAdmin: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/dashboard/review");

  if (user.app_metadata?.role !== "admin") {
    return { evidence: [] as Evidence[], isAdmin: false };
  }

  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("The Supabase service role key is missing.");

  const { data, error } = await adminClient
    .from("evidence")
    .select(
      "id, control_id, file_url, file_name, uploaded_by, uploaded_at, ai_proposed_controls, ai_confidence, review_status, reviewed_by, reviewed_at, notes, control:controls(code, title)"
    )
    .eq("review_status", "pending")
    .order("uploaded_at", { ascending: true });
  if (error) throw new Error(`Unable to load the review queue: ${error.message}`);

  const rows = (data ?? []) as unknown as PendingEvidenceRow[];
  const uploaderIds = [...new Set(rows.map((row) => row.uploaded_by))];
  const uploaderEntries = await Promise.all(
    uploaderIds.map(async (id) => {
      const { data: uploader } = await adminClient.auth.admin.getUserById(id);
      return [id, uploader.user?.email] as const;
    })
  );
  const uploaderEmails = new Map(uploaderEntries);

  const evidence = rows.map(
    ({ control: controlRows, ai_proposed_controls, ...row }): Evidence => ({
      ...row,
      ai_proposed_controls: ai_proposed_controls as AiProposedControl[] | null,
      control_code: controlRows[0]?.code,
      control_title: controlRows[0]?.title,
      uploader_email: uploaderEmails.get(row.uploaded_by),
    })
  );

  return { evidence, isAdmin: true };
}

export default async function ReviewPage() {
  const { evidence, isAdmin } = await getPendingEvidence();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
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

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">
            Evidence Review Queue
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Verify each file and Claude proposal before accepting evidence.
          </p>
        </div>

        {!isAdmin ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="font-medium text-neutral-700">Admin access required</p>
              <p className="mt-2 text-sm text-neutral-500">
                Ask your Supabase administrator to add the admin role to your app
                metadata.
              </p>
            </CardContent>
          </Card>
        ) : evidence.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="font-medium text-neutral-700">Review queue cleared</p>
              <p className="mt-2 text-sm text-neutral-500">
                New evidence will appear here after upload.
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
