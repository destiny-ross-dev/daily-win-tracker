"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleAuthCallback() {
      try {
        // This will parse the URL hash / query params and set the session if present
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!cancelled) {
          if (data.session) {
            router.replace("/dashboard");
          } else {
            // No session means user likely opened the page directly or the link expired
            setError("Unable to sign you in. Please try logging in again.");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Authentication failed."
          );
        }
      }
    }

    handleAuthCallback();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
        {!error ? (
          <>
            <h1 className="text-lg font-medium text-slate-900">
              Signing you in…
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Please wait while we finish setting up your session.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-medium text-rose-700">
              Sign-in failed
            </h1>
            <p className="mt-2 text-sm text-rose-700/90">{error}</p>
            <button
              onClick={() => router.replace("/login")}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            >
              Go to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
