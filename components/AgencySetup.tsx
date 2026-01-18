"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Props = {
  onSuccess?: () => void;
};

type Agency = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
};

export default function AgencySetup({ onSuccess }: Props) {
  const [mode, setMode] = useState<"join" | "create">("join");
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agencyId, setAgencyId] = useState("");

  const [name, setName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAgencies() {
      const { data, error: aErr } = await supabase.rpc(
        "list_agencies_for_join"
      );

      if (cancelled) return;
      if (aErr) {
        setError(aErr.message);
        return;
      }

      const results = (data ?? []) as Agency[];
      setAgencies(results);
      if (!agencyId && results.length > 0) {
        setAgencyId(results[0].id);
      }
    }

    loadAgencies();
    return () => {
      cancelled = true;
    };
  }, [agencyId]);

  const canSubmitCreate = useMemo(() => {
    return !submitting && name.trim().length >= 2;
  }, [submitting, name]);

  const canSubmitJoin = useMemo(() => {
    return !submitting && !!agencyId;
  }, [submitting, agencyId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitCreate) return;

    setSubmitting(true);
    setError(null);

    const { data, error } = await supabase.rpc(
      "bootstrap_create_agency_and_join",
      {
        p_name: name.trim(),
        p_address1: address1.trim() || null,
        p_address2: address2.trim() || null,
        p_city: city.trim() || null,
        p_state: state.trim() || null,
        p_zip: zip.trim() || null,
      }
    );

    if (error) {
      setError(error.message);
      setSubmitting(false);
      return;
    }

    // data is the new agency_id (uuid)
    setSubmitting(false);
    onSuccess?.();
  }

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitJoin) return;

    setSubmitting(true);
    setError(null);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      setError(userErr?.message ?? "Unable to load user.");
      setSubmitting(false);
      return;
    }

    const { error: joinErr } = await supabase.rpc("join_agency", {
      p_agency_id: agencyId,
    });

    if (joinErr) {
      setError(joinErr.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSuccess?.();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Join or create an agency
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        You’re signed in, but you’re not attached to an agency yet. Join an
        existing agency or create a new one to unlock the dashboard.
      </p>

      <div className="mt-4 inline-flex rounded-lg border border-slate-200 p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode("join")}
          className={`rounded-md px-3 py-1.5 font-medium ${
            mode === "join"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Join agency
        </button>
        <button
          type="button"
          onClick={() => setMode("create")}
          className={`rounded-md px-3 py-1.5 font-medium ${
            mode === "create"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Create new
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {mode === "join" ? (
        <form onSubmit={onJoin} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Choose an agency
            </label>
            <select
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              {agencies.length === 0 ? (
                <option value="">No agencies found</option>
              ) : (
                agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                    {agency.city || agency.state
                      ? ` • ${agency.city ?? ""}${agency.city && agency.state ? ", " : ""}${agency.state ?? ""}`
                      : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          <button
            type="submit"
            disabled={!canSubmitJoin}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Joining agency..." : "Join agency"}
          </button>
        </form>
      ) : (
        <form onSubmit={onCreate} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Agency name <span className="text-rose-600">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="e.g., Mendy Dunn Agency"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Address 1
              </label>
              <input
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="123 Main St"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Address 2
              </label>
              <input
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="Suite / Apt"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                City
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                State
              </label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="AL"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                ZIP
              </label>
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="35203"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmitCreate}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating agency..." : "Create agency"}
          </button>

          <p className="text-xs text-slate-500">
            This will attach your account to the new agency and set you as admin
            (per your RPC).
          </p>
        </form>
      )}
    </div>
  );
}
