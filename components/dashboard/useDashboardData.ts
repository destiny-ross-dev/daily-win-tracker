"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays } from "date-fns";
import { supabase } from "@/lib/supabase/client";
import { isoDateLocal, parseIsoDateLocal } from "@/lib/dates";

type Producer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type ProducerRecord = Producer;

type ProducerRow = Producer & {
  dials: number;
  quotes: number;
  issued: number;
  appointments: number;
};

type DailyActivity = {
  user_id: string;
  no_answer_count: number | null;
  bad_contact_count: number | null;
  not_interested_count: number | null;
  callback_scheduled: number | null;
  quoted_callback_scheduled_count: number | null;
  quoted_lost_count: number | null;
  sales_count: number | null;
};

type Appointment = {
  id: string;
  user_id: string;
  datetime: string;
  policyholder: string;
};

type QuoteSale = {
  id: string;
  user_id: string;
  policyholder: string;
  lob: string;
  quoted_date: string | null;
  quoted_premium: number | null;
  issued_date: string | null;
  issued_premium: number | null;
};

export type DateRange = {
  startDate: string;
  endDate: string;
};

type DailyActivityTotals = {
  no_answer_count: number;
  bad_contact_count: number;
  not_interested_count: number;
  callback_scheduled: number;
  quoted_callback_scheduled_count: number;
  quoted_lost_count: number;
  sales_count: number;
};

const emptyDailyTotals = (): DailyActivityTotals => ({
  no_answer_count: 0,
  bad_contact_count: 0,
  not_interested_count: 0,
  callback_scheduled: 0,
  quoted_callback_scheduled_count: 0,
  quoted_lost_count: 0,
  sales_count: 0,
});

export function useDashboardData(range?: DateRange) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [producers, setProducers] = useState<Producer[]>([]);
  const [rows, setRows] = useState<ProducerRow[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [quotes, setQuotes] = useState<QuoteSale[]>([]);

  const startDate = range?.startDate ?? isoDateLocal();
  const endDate = range?.endDate ?? startDate;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // 1) Producers in my agency (RLS should scope this)
      const { data: profs, error: pErr } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .order("last_name", { ascending: true });

      if (cancelled) return;
      if (pErr) {
        setError(pErr.message);
        setLoading(false);
        return;
      }

      const producerList: Producer[] = (profs ?? []).map((p: ProducerRecord) => ({
        id: p.id,
        first_name: p.first_name ?? null,
        last_name: p.last_name ?? null,
      }));

      setProducers(producerList);

      const userIds = producerList.map((p) => p.id);
      if (userIds.length === 0) {
        setRows([]);
        setAppointments([]);
        setQuotes([]);
        setLoading(false);
        return;
      }

      // 2) Daily activities for range
      const { data: acts, error: aErr } = await supabase
        .from("daily_activities")
        .select(
          "user_id, no_answer_count, bad_contact_count, not_interested_count, callback_scheduled, quoted_callback_scheduled_count, quoted_lost_count, sales_count"
        )
        .gte("date", startDate)
        .lte("date", endDate)
        .in("user_id", userIds);

      if (cancelled) return;
      if (aErr) {
        setError(aErr.message);
        setLoading(false);
        return;
      }

      const activityByUser = new Map<string, DailyActivityTotals>();
      (acts ?? []).forEach((a: DailyActivity) => {
        const current = activityByUser.get(a.user_id) ?? emptyDailyTotals();
        activityByUser.set(a.user_id, {
          no_answer_count: current.no_answer_count + (a.no_answer_count ?? 0),
          bad_contact_count: current.bad_contact_count + (a.bad_contact_count ?? 0),
          not_interested_count:
            current.not_interested_count + (a.not_interested_count ?? 0),
          callback_scheduled:
            current.callback_scheduled + (a.callback_scheduled ?? 0),
          quoted_callback_scheduled_count:
            current.quoted_callback_scheduled_count +
            (a.quoted_callback_scheduled_count ?? 0),
          quoted_lost_count:
            current.quoted_lost_count + (a.quoted_lost_count ?? 0),
          sales_count: current.sales_count + (a.sales_count ?? 0),
        });
      });

      // 3) Appointments within range (local date window)
      // We'll use >= start 00:00 and < (end + 1 day) 00:00 in local time
      const start = parseIsoDateLocal(startDate);
      const end = addDays(parseIsoDateLocal(endDate), 1);

      const { data: appts, error: apErr } = await supabase
        .from("daily_appointments")
        .select("id, user_id, datetime, policyholder")
        .gte("datetime", start.toISOString())
        .lt("datetime", end.toISOString())
        .in("user_id", userIds)
        .order("datetime", { ascending: true });

      if (cancelled) return;
      if (apErr) {
        setError(apErr.message);
        setLoading(false);
        return;
      }

      setAppointments(appts ?? []);

      // 4) Quotes/sales in range
      // Get records that were quoted in range OR issued in range (for a “range activity” view)
      const { data: qs, error: qErr } = await supabase
        .from("quotes_sales")
        .select(
          "id, user_id, policyholder, lob, quoted_date, quoted_premium, issued_date, issued_premium"
        )
        .in("user_id", userIds)
        .or(
          `and(quoted_date.gte.${startDate},quoted_date.lte.${endDate}),and(issued_date.gte.${startDate},issued_date.lte.${endDate})`
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (cancelled) return;
      if (qErr) {
        setError(qErr.message);
        setLoading(false);
        return;
      }

      setQuotes(qs ?? []);

      // Build producer rows
      const quoteCountByUser = new Map<string, number>();
      const issuedCountByUser = new Map<string, number>();
      const apptCountByUser = new Map<string, number>();

      const isInRange = (value: string | null) =>
        !!value && value >= startDate && value <= endDate;

      (qs ?? []).forEach((r: QuoteSale) => {
        if (isInRange(r.quoted_date)) {
          quoteCountByUser.set(
            r.user_id,
            (quoteCountByUser.get(r.user_id) ?? 0) + 1
          );
        }
        if (isInRange(r.issued_date)) {
          issuedCountByUser.set(
            r.user_id,
            (issuedCountByUser.get(r.user_id) ?? 0) + 1
          );
        }
      });

      (appts ?? []).forEach((r: Appointment) => {
        apptCountByUser.set(
          r.user_id,
          (apptCountByUser.get(r.user_id) ?? 0) + 1
        );
      });

      const computedRows: ProducerRow[] = producerList.map((p) => {
        const a = activityByUser.get(p.id);
        const dials =
          (a?.no_answer_count ?? 0) +
          (a?.bad_contact_count ?? 0) +
          (a?.not_interested_count ?? 0) +
          (a?.callback_scheduled ?? 0) +
          (a?.quoted_callback_scheduled_count ?? 0) +
          (a?.quoted_lost_count ?? 0) +
          (a?.sales_count ?? 0);

        return {
          ...p,
          dials,
          quotes: quoteCountByUser.get(p.id) ?? 0,
          issued: issuedCountByUser.get(p.id) ?? 0,
          appointments: apptCountByUser.get(p.id) ?? 0,
        };
      });

      setRows(computedRows);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  const teamTotals = useMemo(() => {
    const totals = rows.reduce(
      (acc, r) => {
        acc.dials += r.dials;
        acc.quotes += r.quotes;
        acc.issued += r.issued;
        acc.appointments += r.appointments;
        return acc;
      },
      { dials: 0, quotes: 0, issued: 0, appointments: 0 }
    );
    return totals;
  }, [rows]);

  return {
    loading,
    error,
    producers,
    rows,
    appointments,
    quotes,
    teamTotals,
  };
}
