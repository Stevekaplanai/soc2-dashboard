"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user && !data.session) {
      // Email confirmation required
      setSuccess(true);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <ShieldCheck className="h-6 w-6 text-neutral-900" />
          <span className="text-lg font-bold">SOC2 Dashboard</span>
        </div>
        <h1 className="mb-1 text-xl font-semibold">Create account</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Start tracking your SOC2 compliance.
        </p>

        {success ? (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
            <p className="font-medium">Check your email</p>
            <p className="mt-1">
              We sent a confirmation link to {email}. Click it to activate your
              account, then{" "}
              <Link href="/auth/login" className="underline">
                log in
              </Link>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                placeholder="At least 6 characters"
              />
            </div>
            {error && (
              <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-neutral-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-neutral-900 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}