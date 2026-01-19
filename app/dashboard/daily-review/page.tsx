"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { isoDateLocal } from "@/lib/dates";
import { useAuth } from "@/components/providers/AuthProvider";

type HourlyActivity = {
  hour: number;
  calls: number | null;
  quotes: number | null;
  sales: number | null;
  won: boolean | null;
};

type HourRow = {
  hour: number;
  calls: number;
  quotes: number;
  sales: number;
  won: boolean;
};

const emptyHour = (hour: number): HourRow => ({
  hour,
  calls: 0,
  quotes: 0,
  sales: 0,
  won: false,
});

export default function DailyReviewPage() {
  const { user } = useAuth();
  const date = useMemo(() => isoDateLocal(), []);
  const [hours, setHours] = useState<HourRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) return;
      setLoading(true);
      setError(null);

      const { data, error: hErr } = await supabase
        .from("hourly_activity")
        .select("hour, calls, quotes, sales, won")
        .eq("user_id", user.id)
        .eq("date", date)
        .order("hour", { ascending: true });

      if (cancelled) return;
      if (hErr) {
        setError(hErr.message);
        setLoading(false);
        return;
      }

      const base = Array.from({ length: 9 }, (_, idx) => emptyHour(idx + 9));
      const byHour = new Map<number, HourlyActivity>();
      (data ?? []).forEach((row: HourlyActivity) => byHour.set(row.hour, row));

      const merged = base.map((row) => {
        const stored = byHour.get(row.hour);
        if (!stored) return row;
        return {
          hour: row.hour,
          calls: Number(stored.calls ?? 0),
          quotes: Number(stored.quotes ?? 0),
          sales: Number(stored.sales ?? 0),
          won: Boolean(stored.won),
        };
      });

      setHours(merged);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [date, user]);

  const wins = hours.filter((h) => h.won).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Daily Review
            </h1>
            <p className="mt-1 text-xs text-slate-500">Date: {date}</p>
          </div>
          <div className="text-sm text-slate-600">
            Wins today:{" "}
            <span className="font-semibold text-slate-900">{wins}</span>
          </div>
        </div>
        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Hourly wins</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="text-sm text-slate-600">Loading hours…</div>
          ) : (
            hours.map((hour) => (
              <div
                key={hour.hour}
                className={`rounded-xl border px-4 py-4 ${
                  hour.won
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-100 bg-slate-50"
                }`}
              >
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  {String(hour.hour).padStart(2, "0")}:00 -{" "}
                  {String(hour.hour).padStart(2, "0")}:59
                </div>
                <div
                  className={`mt-2 text-sm font-semibold ${
                    hour.won ? "text-emerald-700" : "text-slate-700"
                  }`}
                >
                  {hour.won ? "Won" : "Lost"}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
                  <div>
                    <div className="text-slate-500">Calls</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {hour.calls}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Quotes</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {hour.quotes}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Sales</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {hour.sales}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
