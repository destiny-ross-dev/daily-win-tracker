"use client";

import { useMemo, useState } from "react";
import {
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import AgencySetup from "@/components/AgencySetup";
import {
  DateRange,
  useDashboardData,
} from "@/components/dashboard/useDashboardData";
import { isoDateLocal, parseIsoDateLocal } from "@/lib/dates";
import { useDashboardProfile } from "@/components/dashboard/DashboardProfileContext";

type RangePreset = "today" | "this_week" | "this_month" | "custom";

export default function DashboardPage() {
  const [preset, setPreset] = useState<RangePreset>("today");
  const [customStart, setCustomStart] = useState(isoDateLocal());
  const [customEnd, setCustomEnd] = useState(isoDateLocal());

  const range = useMemo<DateRange>(() => {
    const today = new Date();
    if (preset === "today") {
      const date = isoDateLocal(today);
      return { startDate: date, endDate: date };
    }
    if (preset === "this_week") {
      const start = startOfWeek(today, { weekStartsOn: 1 });
      const end = endOfWeek(today, { weekStartsOn: 1 });
      return { startDate: isoDateLocal(start), endDate: isoDateLocal(end) };
    }
    if (preset === "this_month") {
      return {
        startDate: isoDateLocal(startOfMonth(today)),
        endDate: isoDateLocal(endOfMonth(today)),
      };
    }
    return { startDate: customStart, endDate: customEnd };
  }, [preset, customStart, customEnd]);

  const coverageLabel = useMemo(() => {
    const start = format(parseIsoDateLocal(range.startDate), "MMM d, yyyy");
    const end = format(parseIsoDateLocal(range.endDate), "MMM d, yyyy");
    return start === end ? start : `${start} → ${end}`;
  }, [range.endDate, range.startDate]);

  const rangeSuffix = useMemo(() => {
    switch (preset) {
      case "today":
        return "today";
      case "this_week":
        return "this week";
      case "this_month":
        return "this month";
      default:
        return "custom range";
    }
  }, [preset]);

  const dash = useDashboardData(range);
  const {
    profile,
    loading: profileLoading,
    error,
    refresh,
  } = useDashboardProfile();

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm text-center">
          <div className="text-lg font-medium text-slate-900">Loading…</div>
          <div className="mt-2 text-sm text-slate-600">
            Preparing your dashboard.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Dashboard
              </h1>
            </div>
            {error ? (
              <button
                onClick={refresh}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                Retry profile
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm font-semibold text-slate-700">
              Date Range
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: "today", label: "Today" },
                  { id: "this_week", label: "This Week" },
                  { id: "this_month", label: "This Month" },
                  { id: "custom", label: "Custom" },
                ] as const
              ).map((option) => {
                const isActive = preset === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPreset(option.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Showing: {coverageLabel}
              </span>
            </div>
          </div>

          {preset === "custom" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">
                Start date
                <input
                  type="date"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  value={customStart}
                  onChange={(event) => {
                    const next = event.target.value || customStart;
                    setCustomStart(next);
                    if (next > customEnd) {
                      setCustomEnd(next);
                    }
                  }}
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                End date
                <input
                  type="date"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                  value={customEnd}
                  onChange={(event) => {
                    const next = event.target.value || customEnd;
                    setCustomEnd(next);
                    if (next < customStart) {
                      setCustomStart(next);
                    }
                  }}
                />
              </label>
            </div>
          ) : null}
        </div>

        {/* Agency setup gate */}
        {!profile?.agency_id ? (
          <AgencySetup
            onSuccess={() => {
              refresh();
              // Note: useDashboardData will start working once agency_id exists
            }}
          />
        ) : (
          <>
            {/* Team KPI row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Team dials" value={dash.teamTotals.dials} />
              <KpiCard
                label={`Team quotes (${rangeSuffix})`}
                value={dash.teamTotals.quotes}
              />
              <KpiCard
                label={`Team sales (${rangeSuffix})`}
                value={dash.teamTotals.sales}
              />
              <KpiCard
                label={`Appointments (${rangeSuffix})`}
                value={dash.teamTotals.appointments}
              />
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Producer table */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Producers
                  </h2>
                  {dash.loading ? (
                    <span className="text-xs text-slate-500">Refreshing…</span>
                  ) : null}
                </div>

                {dash.error ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                    {dash.error}
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-slate-500">
                        <tr className="[&>th]:pb-2">
                          <th>Name</th>
                          <th className="text-right">Dials</th>
                          <th className="text-right">Quotes</th>
                          <th className="text-right">Sales</th>
                          <th className="text-right">Appts</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-900">
                        {dash.rows.map((r) => {
                          const n =
                            `${r.first_name ?? ""} ${
                              r.last_name ?? ""
                            }`.trim() || "—";
                          return (
                            <tr
                              key={r.id}
                              className="border-t border-slate-100"
                            >
                              <td className="py-2">{n}</td>
                              <td className="py-2 text-right tabular-nums">
                                {r.dials}
                              </td>
                              <td className="py-2 text-right tabular-nums">
                                {r.quotes}
                              </td>
                              <td className="py-2 text-right tabular-nums">
                                {r.sales}
                              </td>
                              <td className="py-2 text-right tabular-nums">
                                {r.appointments}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Appointments
                  </h2>
                  <div className="mt-4 space-y-3">
                    {dash.appointments.length === 0 ? (
                      <div className="text-sm text-slate-600">
                        No appointments scheduled.
                      </div>
                    ) : (
                      dash.appointments.slice(0, 12).map((a) => (
                        <div
                          key={a.id}
                          className="rounded-xl border border-slate-100 p-3"
                        >
                          <div className="text-sm font-medium text-slate-900">
                            {a.policyholder}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {format(parseISO(a.datetime), "p")}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Live activity
                    </h2>
                    {dash.feedLoading ? (
                      <span className="text-xs text-slate-500">Refreshing…</span>
                    ) : null}
                  </div>
                  <div className="mt-4 space-y-3">
                    {dash.feed.length === 0 && !dash.feedLoading ? (
                      <div className="text-sm text-slate-600">
                        No recent activity yet.
                      </div>
                    ) : null}
                    {dash.feed.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="rounded-xl border border-slate-100 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {item.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {item.detail} • {item.userName}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.timestamp
                              ? format(parseISO(item.timestamp), "MMM d, h:mm a")
                              : "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}
