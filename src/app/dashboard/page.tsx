import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard-client";
import { Card, CardContent } from "@/components/ui/card";
import {
  type ControlStatusRow,
  type ControlCategory,
} from "@/lib/types";
import { ShieldCheck, LogOut, Settings, ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

async function getControls() {
  const supabase = await createClient();
  if (!supabase) return { controls: [] as ControlStatusRow[], isAdmin: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/dashboard");

  const [statusResult, controlsResult] = await Promise.all([
    supabase.from("control_status").select("*").order("code"),
    supabase.from("controls").select("id, description"),
  ]);
  if (statusResult.error) {
    throw new Error(`Unable to load controls: ${statusResult.error.message}`);
  }
  if (controlsResult.error) {
    throw new Error(`Unable to load control descriptions: ${controlsResult.error.message}`);
  }

  const descriptions = new Map(
    (controlsResult.data ?? []).map((control) => [control.id, control.description])
  );
  const controls = (statusResult.data ?? []).map((control) => ({
    ...(control as Omit<ControlStatusRow, "description">),
    description: descriptions.get(control.control_id) ?? "",
  }));
  return { controls, isAdmin: user.app_metadata?.role === "admin" };
}

export default async function DashboardPage() {
  const { controls, isAdmin } = await getControls();

  const total = controls.length;
  const passing = controls.filter((c) => c.status === "passing").length;
  const inReview = controls.filter((c) => c.status === "in_review").length;
  const notStarted = controls.filter((c) => c.status === "not_started").length;
  const percentage = total > 0 ? Math.round((passing / total) * 100) : 0;

  // Group by category
  const categories = ["CC", "A", "PI", "C", "P"] as ControlCategory[];
  const grouped = categories
    .map((cat) => ({
      category: cat,
      controls: controls.filter((c) => c.category === cat),
    }))
    .filter((g) => g.controls.length > 0);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Top bar */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
            >
              <ArrowLeft className="h-4 w-4" /> Home
            </Link>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-neutral-900" />
              <span className="hidden font-semibold sm:inline">SOC2 Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/dashboard/review"
                className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
              >
                <Settings className="h-4 w-4" /> Review Queue
              </Link>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Summary strip */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">{passing}</div>
              <div className="mt-1 text-sm text-neutral-500">Passing</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-yellow-600">{inReview}</div>
              <div className="mt-1 text-sm text-neutral-500">In Review</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-red-600">{notStarted}</div>
              <div className="mt-1 text-sm text-neutral-500">Not Started</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-neutral-900">{percentage}%</div>
              <div className="mt-1 text-sm text-neutral-500">Compliance</div>
            </CardContent>
          </Card>
        </div>

        {total === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-neutral-500">
                No controls found. Run the migration and seed file in your Supabase
                project to get started.
              </p>
              <p className="mt-2 text-sm text-neutral-400">
                See <code className="rounded bg-neutral-100 px-1.5 py-0.5">/supabase/migrations/</code> and{" "}
                <code className="rounded bg-neutral-100 px-1.5 py-0.5">/supabase/seed.sql</code>
              </p>
            </CardContent>
          </Card>
        ) : (
          <DashboardClient grouped={grouped} />
        )}
      </main>
    </div>
  );
}
