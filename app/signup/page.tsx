"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type SignupState = "idle" | "submitting" | "success";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function SignupPage() {
  const router = useRouter();
  const [state, setState] = useState<SignupState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = useMemo(() => {
    if (state === "submitting") return false;
    if (!firstName.trim() || !lastName.trim()) return false;
    if (!isValidEmail(email)) return false;
    if (password.length < 8) return false;
    return true;
  }, [state, firstName, lastName, email, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) return;

    setState("submitting");

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role: "producer", // <-- change if you prefer "agent"
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setState("idle");
      return;
    }

    // Supabase may return a session immediately OR require email confirmation.
    if (data?.session) {
      router.replace("/dashboard");
      return;
    }

    setState("success");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900">
            Create account
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign up to start tracking daily activity, goals, quotes, and sales.
          </p>

          {state === "success" ? (
            <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-medium">Check your email</p>
              <p className="mt-1 text-emerald-900/90">
                If email confirmation is enabled, we sent you a link to verify
                your account. After verifying, sign in to finish agency setup.
              </p>
              <div className="mt-4">
                <Link
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
                  href="/login"
                >
                  Go to login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  {error}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    First name
                  </label>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Last name
                  </label>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

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
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Minimum 8 characters.
                </p>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === "submitting"
                  ? "Creating account..."
                  : "Create account"}
              </button>

              <p className="text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link className="text-slate-900 underline" href="/login">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
