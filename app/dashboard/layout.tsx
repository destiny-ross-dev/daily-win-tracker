// =========================================================
// 3) app/dashboard/layout.tsx  (protected dashboard shell)
// =========================================================
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../components/providers/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { capitalizeFirstLetter } from "@/lib/displayHelpers";
import {
  DashboardProfile,
  DashboardProfileContext,
} from "@/components/dashboard/DashboardProfileContext";

type NavLink = {
  href: string;
  label: string;
};

const navLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/daily-goals", label: "Today's Goals" },
  { href: "/dashboard/activity", label: "Activity Log" },
  { href: "/dashboard/metrics", label: "Metrics" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();

  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setProfileError(null);

    const { data: p, error: pErr } = await supabase
      .from("profiles")
      .select("first_name, last_name, email, agency_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (pErr) {
      setProfileError(pErr.message);
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    if (!p) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let agency_name: string | null = null;
    if (p.agency_id) {
      const { data: a, error: aErr } = await supabase
        .from("agencies")
        .select("name")
        .eq("id", p.agency_id)
        .maybeSingle();
      if (aErr) {
        setProfileError(aErr.message);
        setProfile(null);
        setProfileLoading(false);
        return;
      }
      agency_name = a?.name ?? null;
    }

    setProfile({
      first_name: p.first_name ?? null,
      last_name: p.last_name ?? null,
      email: p.email ?? null,
      agency_id: p.agency_id ?? null,
      role: p.role ?? null,
      agency_name,
    });
    setProfileLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || !user) return;
    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, user, loadProfile]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
          <div className="text-lg font-medium text-slate-900">Loading…</div>
          <div className="mt-2 text-sm text-slate-600">
            Checking your session.
          </div>
        </div>
      </div>
    );
  }

  // While redirecting, render nothing (prevents a flash of protected UI)
  if (!user) return null;

  const displayName =
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
    profile?.email ||
    user.email ||
    "User";

  const agencyName = profile?.agency_name ?? "Agency: Not set";
  const roleLabel = profile?.role ? capitalizeFirstLetter(profile.role) : null;

  return (
    <DashboardProfileContext.Provider
      value={{
        profile,
        loading: profileLoading,
        error: profileError,
        refresh: loadProfile,
      }}
    >
      <div className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen flex-col md:flex-row">
          <aside className="w-full md:w-60 border-b md:border-b-0 md:border-r border-slate-200 bg-white">
            <div className="px-6 py-5">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Navigation
              </div>
              <nav className="mt-4 space-y-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                        isActive
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>

          <div className="flex min-h-screen flex-1 min-w-0 flex-col">
            <header className="border-b border-slate-200 bg-white">
              <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    {displayName}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {agencyName}
                    {roleLabel ? ` • ${roleLabel}` : ""}
                  </div>
                  {profileError ? (
                    <div className="mt-2 text-xs text-rose-700">
                      {profileError}
                    </div>
                  ) : null}
                  {profileLoading ? (
                    <div className="mt-2 text-xs text-slate-500">
                      Loading profile…
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Sign out
                </button>
              </div>
            </header>

            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </div>
    </DashboardProfileContext.Provider>
  );
}
