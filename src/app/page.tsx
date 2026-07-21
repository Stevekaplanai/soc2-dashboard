import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, FileText, Brain, CheckCircle2, ArrowRight, Github } from "lucide-react";

async function getComplianceStats() {
  const supabase = await createClient();
  if (!supabase) {
    return { total: 0, passing: 0, in_review: 0, not_started: 0, percentage: 0, hasData: false };
  }

  try {
    const { data, error } = await supabase
      .from("control_status")
      .select("*");

    if (error || !data) {
      return { total: 0, passing: 0, in_review: 0, not_started: 0, percentage: 0, hasData: false };
    }

    const total = data.length;
    const passing = data.filter((c: any) => c.status === "passing").length;
    const in_review = data.filter((c: any) => c.status === "in_review").length;
    const not_started = data.filter((c: any) => c.status === "not_started").length;
    const percentage = total > 0 ? Math.round((passing / total) * 100) : 0;

    return { total, passing, in_review, not_started, percentage, hasData: true };
  } catch {
    return { total: 0, passing: 0, in_review: 0, not_started: 0, percentage: 0, hasData: false };
  }
}

export default async function HomePage() {
  const stats = await getComplianceStats();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-neutral-900" />
            <span className="text-lg font-bold">SOC2 Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/Stevekaplanai/soc2-dashboard"
              className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
            >
              <Github className="h-4 w-4" />
              GitHub
            </Link>
            <Link
              href="/auth/login"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center">
            <Badge variant="secondary" className="mb-6">
              Open Source · Self-Hosted · $0/month
            </Badge>
            <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight text-neutral-900 sm:text-6xl">
              SOC2 compliance without the{" "}
              <span className="text-red-600 line-through">$100K/yr</span> Vanta invoice
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600">
              A SOC2 compliance dashboard you own. Upload evidence, let Claude map it
              to controls, have a human review and approve. Full audit log. No enterprise
              sales calls.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
              >
                View Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="https://github.com/Stevekaplanai/soc2-dashboard"
                className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Github className="h-4 w-4" /> Fork on GitHub
              </Link>
            </div>
          </div>

          {/* Live compliance numbers */}
          <div className="mx-auto mt-20 max-w-4xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Live Compliance Status
              </h2>
              {stats.hasData && (
                <Link
                  href="/dashboard"
                  className="text-sm text-neutral-600 hover:text-neutral-900"
                >
                  View details →
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-3xl text-green-600">
                    {stats.passing}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-500">Passing</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-3xl text-yellow-600">
                    {stats.in_review}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-500">In Review</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-3xl text-red-600">
                    {stats.not_started}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-500">Not Started</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-3xl text-neutral-900">
                    {stats.percentage}%
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-500">Compliance</p>
                </CardContent>
              </Card>
            </div>
            {!stats.hasData && (
              <p className="mt-4 text-center text-sm text-neutral-400">
                Connect Supabase to see live data · {stats.total} controls seeded
              </p>
            )}
          </div>

          {/* Features */}
          <div className="mx-auto mt-24 max-w-5xl">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100">
                  <FileText className="h-6 w-6 text-neutral-700" />
                </div>
                <h3 className="mb-2 font-semibold">Evidence Upload</h3>
                <p className="text-sm text-neutral-600">
                  Upload PDFs, screenshots, and docs to Supabase Storage. Private,
                  signed URLs. 10MB max.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100">
                  <Brain className="h-6 w-6 text-neutral-700" />
                </div>
                <h3 className="mb-2 font-semibold">AI Control Mapping</h3>
                <p className="text-sm text-neutral-600">
                  Claude reads your evidence and proposes which SOC2 controls it
                  satisfies — with confidence levels and reasoning.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100">
                  <CheckCircle2 className="h-6 w-6 text-neutral-700" />
                </div>
                <h3 className="mb-2 font-semibold">Human Review Gate</h3>
                <p className="text-sm text-neutral-600">
                  AI proposes, a human confirms. Every acceptance is logged with a
                  name and timestamp. Defensible in an audit.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-neutral-500">
          <p>
            Built with Next.js + Supabase + Claude. Open source.{" "}
            <Link
              href="https://github.com/Stevekaplanai/soc2-dashboard"
              className="underline hover:text-neutral-900"
            >
              github.com/Stevekaplanai/soc2-dashboard
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}