"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { supabase } from "@/lib/supabase/client";
import { isoDateLocal } from "@/lib/dates";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  DateRangePicker,
  DateRangePreset,
} from "@/components/dashboard/DateRangePicker";

type Metrics = {
  totalCalls: number;
  contacts: number;
  pitches: number;
  sales: number;
};

const emptyMetrics: Metrics = {
  totalCalls: 0,
  contacts: 0,
  pitches: 0,
  sales: 0,
};

export default function MetricsPage() {
  const { user } = useAuth();
  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [customStart, setCustomStart] = useState(isoDateLocal());
  const [customEnd, setCustomEnd] = useState(isoDateLocal());

  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) return;
      setLoading(true);
      setError(null);

      const { data: acts, error: aErr } = await supabase
        .from("daily_activities")
        .select(
          "no_answer_count, bad_contact_count, not_interested_count, callback_scheduled, quoted_callback_scheduled_count, quoted_lost_count, sales_count"
        )
        .eq("user_id", user.id)
        .gte("date", range.startDate)
        .lte("date", range.endDate);

      if (cancelled) return;
      if (aErr) {
        setError(aErr.message);
        setLoading(false);
        return;
      }

      const activityTotals = (acts ?? []).reduce(
        (acc, row) => {
          acc.noAnswer += row.no_answer_count ?? 0;
          acc.badContact += row.bad_contact_count ?? 0;
          acc.notInterested += row.not_interested_count ?? 0;
          acc.callbackScheduled += row.callback_scheduled ?? 0;
          acc.quotedCallback += row.quoted_callback_scheduled_count ?? 0;
          acc.quotedLost += row.quoted_lost_count ?? 0;
          acc.salesCount += row.sales_count ?? 0;
          return acc;
        },
        {
          noAnswer: 0,
          badContact: 0,
          notInterested: 0,
          callbackScheduled: 0,
          quotedCallback: 0,
          quotedLost: 0,
          salesCount: 0,
        }
      );

      const { data: salesRows, error: sErr } = await supabase
        .from("quotes_sales")
        .select("written_date, written_premium")
        .eq("user_id", user.id)
        .gte("written_date", range.startDate)
        .lte("written_date", range.endDate);

      if (cancelled) return;
      if (sErr) {
        setError(sErr.message);
        setLoading(false);
        return;
      }

      const sales = (salesRows ?? []).filter(
        (row) => row.written_date && row.written_premium != null
      ).length;

      const contacts =
        activityTotals.callbackScheduled +
        activityTotals.notInterested +
        activityTotals.quotedLost +
        activityTotals.quotedCallback +
        sales;

      const totalCalls =
        activityTotals.noAnswer +
        activityTotals.badContact +
        activityTotals.notInterested +
        activityTotals.callbackScheduled +
        activityTotals.quotedLost +
        activityTotals.quotedCallback +
        sales;

      const pitches =
        activityTotals.quotedLost + activityTotals.quotedCallback + sales;

      setMetrics({
        totalCalls,
        contacts,
        pitches,
        sales,
      });

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [range.endDate, range.startDate, user]);

  const contactRate = percent(metrics.contacts, metrics.totalCalls);
  const pitchRate = percent(metrics.pitches, metrics.contacts);
  const conversionRate = percent(metrics.sales, metrics.pitches);

  return (
    <div className="space-y-6">
      {/* <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Metrics</h1>
            <p className="mt-1 text-xs text-slate-500">
              Date range: <span className="font-medium">{coverageLabel}</span>
            </p>
          </div>
        </div>
      </div> */}

      <DateRangePicker
        preset={preset}
        onPresetChange={setPreset}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Contact rate"
          value={contactRate}
          sublabel={`${metrics.contacts} contacts / ${metrics.totalCalls} calls`}
          loading={loading}
        />
        <MetricCard
          label="Pitch rate"
          value={pitchRate}
          sublabel={`${metrics.pitches} pitches / ${metrics.contacts} contacts`}
          loading={loading}
        />
        <MetricCard
          label="Conversion rate"
          value={conversionRate}
          sublabel={`${metrics.sales} sales / ${metrics.pitches} pitches`}
          loading={loading}
        />
      </div>
    </div>
  );
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return "0%";
  const value = (numerator / denominator) * 100;
  return `${value.toFixed(2)}%`;
}

function MetricCard({
  label,
  value,
  sublabel,
  loading,
}: {
  label: string;
  value: string;
  sublabel: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900 tabular-nums">
        {loading ? "—" : value}
      </div>
      <div className="mt-2 text-xs text-slate-500">{sublabel}</div>
    </div>
  );
}
