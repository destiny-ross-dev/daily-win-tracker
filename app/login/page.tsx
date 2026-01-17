// app/login/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "../../components/providers/AuthProvider";

type LoginState = "idle" | "submitting";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [state, setState] = useState<LoginState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // If already signed in, skip login page
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  const canSubmit = useMemo(() => {
    if (state === "submitting") return false;
    if (!isValidEmail(email)) return false;
    if (password.length < 1) return false;
    return true;
  }, [state, email, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setState("submitting");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setState("idle");
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Welcome back. Enter your details to continue.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state === "submitting" ? "Signing in..." : "Sign in"}
            </button>

            <p className="text-center text-sm text-slate-600">
              New here?{" "}
              <Link className="text-slate-900 underline" href="/signup">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
