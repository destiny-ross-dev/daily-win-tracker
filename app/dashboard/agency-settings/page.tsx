"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useDashboardProfile } from "@/components/dashboard/DashboardProfileContext";
import { displayDateWeekdayMonthDayYearLong } from "@/lib/displayHelpers";

type DncDay = {
  id: string;
  agency_id: string;
  date: string;
  holiday_name: string;
};

export default function AgencySettingsPage() {
  const router = useRouter();
  const { profile, loading, error } = useDashboardProfile();
  const isAdmin = profile?.role?.toLowerCase() === "admin";
  const agencyId = profile?.agency_id ?? null;
  const dncToggleStorageKey = "agencySettings.dncDaysOpen";

  const [dncDays, setDncDays] = useState<DncDay[]>([]);
  const [dncLoading, setDncLoading] = useState(false);
  const [dncError, setDncError] = useState<string | null>(null);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dncOpen, setDncOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(dncToggleStorageKey) !== "false";
  });

  const canManageDnc = useMemo(
    () => isAdmin && Boolean(agencyId),
    [agencyId, isAdmin],
  );

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, loading, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(dncToggleStorageKey, String(dncOpen));
  }, [dncOpen, dncToggleStorageKey]);

  useEffect(() => {
    if (!canManageDnc) return;
    let cancelled = false;

    async function loadDncDays() {
      setDncLoading(true);
      setDncError(null);

      const { data, error: fetchError } = await supabase
        .from("agency_settings_dnc_days")
        .select("id, agency_id, date, holiday_name")
        .eq("agency_id", agencyId)
        .order("date", { ascending: true });

      if (cancelled) return;
      if (fetchError) {
        setDncError(fetchError.message);
        setDncLoading(false);
        return;
      }

      setDncDays((data ?? []) as DncDay[]);
      setDncLoading(false);
    }

    void loadDncDays();

    return () => {
      cancelled = true;
    };
  }, [agencyId, canManageDnc]);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => {
      setSavedMessage(null);
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  async function handleAddDncDay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agencyId) return;
    if (!holidayDate || !holidayName.trim()) {
      setDncError("Please provide both a date and a holiday name.");
      return;
    }

    setSaving(true);
    setDncError(null);
    setSavedMessage(null);

    const { data, error: insertError } = await supabase
      .from("agency_settings_dnc_days")
      .insert({
        agency_id: agencyId,
        date: holidayDate,
        holiday_name: holidayName.trim(),
      })
      .select("id, agency_id, date, holiday_name")
      .single();

    if (insertError) {
      setDncError(insertError.message);
      setSaving(false);
      return;
    }

    setDncDays((prev) =>
      [...prev, data as DncDay].sort((a, b) => a.date.localeCompare(b.date)),
    );
    setHolidayDate("");
    setHolidayName("");
    setSaving(false);
    setSavedMessage("Do Not Solicit day added.");
  }

  function startEdit(day: DncDay) {
    setEditingId(day.id);
    setEditDate(day.date);
    setEditName(day.holiday_name);
    setDncError(null);
    setSavedMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDate("");
    setEditName("");
  }

  async function handleSaveEdit(id: string) {
    if (!agencyId) return;
    if (!editDate || !editName.trim()) {
      setDncError("Please provide both a date and a holiday name.");
      return;
    }

    setSaving(true);
    setDncError(null);
    setSavedMessage(null);

    const { data, error: updateError } = await supabase
      .from("agency_settings_dnc_days")
      .update({
        date: editDate,
        holiday_name: editName.trim(),
      })
      .eq("id", id)
      .eq("agency_id", agencyId)
      .select("id, agency_id, date, holiday_name")
      .single();

    if (updateError) {
      setDncError(updateError.message);
      setSaving(false);
      return;
    }

    setDncDays((prev) =>
      prev
        .map((day) => (day.id === id ? (data as DncDay) : day))
        .sort((a, b) => a.date.localeCompare(b.date)),
    );
    setSaving(false);
    setSavedMessage("Do Not Solicit day updated.");
    cancelEdit();
  }

  async function handleDelete(id: string) {
    if (!agencyId) return;
    setDeleteId(id);
    setDncError(null);
    setSavedMessage(null);

    const { error: deleteError } = await supabase
      .from("agency_settings_dnc_days")
      .delete()
      .eq("id", id)
      .eq("agency_id", agencyId);

    if (deleteError) {
      setDncError(deleteError.message);
      setDeleteId(null);
      return;
    }

    setDncDays((prev) => prev.filter((day) => day.id !== id));
    setDeleteId(null);
    setSavedMessage("Do Not Solicit day removed.");
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-medium text-slate-900">Loading…</div>
        <div className="mt-2 text-sm text-slate-600">Checking your access.</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Agency Settings
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage agency-level configuration and administrative preferences.
        </p>
        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Do Not Solicit Days
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Block outreach on agency holiday dates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDncOpen((prev) => !prev)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            aria-expanded={dncOpen}
            aria-label={dncOpen ? "Minimize Do Not Solicit Days" : "Expand Do Not Solicit Days"}
            title={dncOpen ? "Minimize" : "Expand"}
          >
            <svg
              aria-hidden="true"
              className={`h-4 w-4 transition-transform ${dncOpen ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M5 7.5l5 5 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {dncOpen ? (
          <>
            <form
              className="mt-5 grid gap-4 sm:grid-cols-3"
              onSubmit={handleAddDncDay}
            >
              <div className="sm:col-span-1">
                <label
                  htmlFor="holiday-date"
                  className="text-sm font-medium text-slate-700"
                >
                  Date
                </label>
                <input
                  id="holiday-date"
                  type="date"
                  value={holidayDate}
                  onChange={(event) => setHolidayDate(event.target.value)}
                  disabled={!canManageDnc || saving}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="holiday-name"
                  className="text-sm font-medium text-slate-700"
                >
                  Holiday name
                </label>
                <input
                  id="holiday-name"
                  type="text"
                  value={holidayName}
                  onChange={(event) => setHolidayName(event.target.value)}
                  disabled={!canManageDnc || saving}
                  placeholder="New Year's Day"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                />
              </div>
              <div className="sm:col-span-3 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={!canManageDnc || saving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {saving ? "Saving..." : "Add DNC day"}
                </button>
                {savedMessage ? (
                  <span className="text-sm text-emerald-700">
                    {savedMessage}
                  </span>
                ) : null}
              </div>
            </form>

            {dncError ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {dncError}
              </div>
            ) : null}

            <div className="mt-6">
              {dncLoading ? (
                <div className="text-sm text-slate-500">
                  Loading DNC days…
                </div>
              ) : dncDays.length === 0 ? (
                <div className="text-sm text-slate-500">
                  No Do Not Solicit dates yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-slate-700">
                    <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Holiday name</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dncDays.map((day) => (
                        <tr
                          key={day.id}
                          className="border-b border-slate-100 last:border-b-0"
                        >
                          <td className="px-3 py-2">
                            {editingId === day.id ? (
                              <input
                                type="date"
                                value={editDate}
                                onChange={(event) =>
                                  setEditDate(event.target.value)
                                }
                                disabled={saving}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                              />
                            ) : (
                              displayDateWeekdayMonthDayYearLong(day.date)
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {editingId === day.id ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(event) =>
                                  setEditName(event.target.value)
                                }
                                disabled={saving}
                                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"
                              />
                            ) : (
                              day.holiday_name
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-2">
                              {editingId === day.id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(day.id)}
                                    disabled={saving}
                                    className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    disabled={saving}
                                    className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEdit(day)}
                                    className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(day.id)}
                                    disabled={deleteId === day.id}
                                    className="rounded-md border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70"
                                  >
                                    {deleteId === day.id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
