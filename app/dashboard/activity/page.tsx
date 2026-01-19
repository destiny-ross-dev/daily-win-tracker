"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  displayDateWeekdayMonthDayYear,
  isoDateLocal,
  parseIsoDateLocal,
} from "@/lib/dates";
import { useAuth } from "@/components/providers/AuthProvider";
import { useDashboardProfile } from "@/components/dashboard/DashboardProfileContext";
import { useDncDay } from "@/components/dashboard/useDncDay";
import { ActivityCard } from "@/components/dashboard/activity/ActivityCard";
import { ActivityFeed } from "@/components/dashboard/activity/ActivityFeed";
import { ActivityField } from "@/components/dashboard/activity/ActivityField";
import { CallbackModal } from "@/components/dashboard/activity/CallbackModal";
import { QuoteModal } from "@/components/dashboard/activity/QuoteModal";
import { formatAppointmentDetail } from "@/components/dashboard/activity/formatAppointmentDetail";
import type {
  ActivityFeedItem,
  CallbackForm,
  QuoteForm,
} from "@/components/dashboard/activity/types";

type DailyActivity = {
  id?: string;
  user_id: string;
  date: string;
  no_answer_count: number | null;
  bad_contact_count: number | null;
  not_interested_count: number | null;
  callback_scheduled: number | null;
  quoted_callback_scheduled_count: number | null;
  quoted_lost_count: number | null;
  sales_count: number | null;
};

type ActivityCounts = Omit<DailyActivity, "id" | "user_id" | "date">;
type ActivityCountKey = keyof ActivityCounts;

const emptyActivity = (): ActivityCounts => ({
  no_answer_count: 0,
  bad_contact_count: 0,
  not_interested_count: 0,
  callback_scheduled: 0,
  quoted_callback_scheduled_count: 0,
  quoted_lost_count: 0,
  sales_count: 0,
});

const emptyQuoteForm = (date: string): QuoteForm => ({
  policyholder: "",
  lob: "auto",
  policy_type: "",
  zipcode: "",
  callback_datetime: "",
  quoted_date: date,
  quoted_premium: "",
  written_date: "",
  written_premium: "",
  issued_date: "",
  issued_premium: "",
});

const emptyCallbackForm = (): CallbackForm => ({
  policyholder: "",
  datetime: "",
});

type QuoteTriggerField =
  | "quoted_callback_scheduled_count"
  | "quoted_lost_count"
  | "sales_count";

const quoteTriggerFields: ReadonlySet<QuoteTriggerField> = new Set([
  "quoted_callback_scheduled_count",
  "quoted_lost_count",
  "sales_count",
]);

function getHourStatsDelta(key: ActivityCountKey, delta: number) {
  const next = { calls: delta, quotes: 0, sales: 0 };
  if (isQuoteTriggerField(key)) {
    if (key === "sales_count") {
      next.sales = delta;
    } else {
      next.quotes = delta;
    }
  }
  return next;
}

function isQuoteTriggerField(
  value: ActivityCountKey,
): value is QuoteTriggerField {
  return quoteTriggerFields.has(value as QuoteTriggerField);
}

export default function ActivityLogPage() {
  const { user } = useAuth();
  const { profile } = useDashboardProfile();
  const date = useMemo(() => isoDateLocal(), []);

  const [activity, setActivity] = useState<ActivityCounts>(emptyActivity());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const { holidayName: dncHolidayName } = useDncDay({
    agencyId: profile?.agency_id ?? null,
    date,
  });

  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState(() => emptyQuoteForm(date));
  const [pendingQuoteField, setPendingQuoteField] =
    useState<QuoteTriggerField | null>(null);
  const [pendingQuoteDelta, setPendingQuoteDelta] = useState(0);

  const [callbackOpen, setCallbackOpen] = useState(false);
  const [callbackSaving, setCallbackSaving] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [callbackForm, setCallbackForm] = useState(emptyCallbackForm());
  const [pendingCallbackDelta, setPendingCallbackDelta] = useState(0);

  const [hourKey, setHourKey] = useState("");
  const [hourStats, setHourStats] = useState({
    calls: 0,
    quotes: 0,
    sales: 0,
  });
  const hourKeyRef = useRef("");
  const hourIntervalRef = useRef<number | null>(null);

  const getHourKey = (value = new Date()) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const hour = String(value.getHours()).padStart(2, "0");
    return `${year}-${month}-${day}-${hour}`;
  };

  const parseHourKey = (key: string) => {
    const parts = key.split("-");
    return {
      date: parts.slice(0, 3).join("-"),
      hour: Number(parts[3] ?? 0),
    };
  };

  const readHourStats = useCallback(
    (key: string) => {
      if (!user) return { calls: 0, quotes: 0, sales: 0 };
      const stored = window.localStorage.getItem(`win-hour-${user.id}-${key}`);
      if (!stored) return { calls: 0, quotes: 0, sales: 0 };
      try {
        const parsed = JSON.parse(stored) as {
          calls?: number;
          quotes?: number;
          sales?: number;
        };
        return {
          calls: Number(parsed.calls ?? 0),
          quotes: Number(parsed.quotes ?? 0),
          sales: Number(parsed.sales ?? 0),
        };
      } catch {
        return { calls: 0, quotes: 0, sales: 0 };
      }
    },
    [user],
  );

  const loadHourStatsForKey = useCallback(
    async (key: string) => {
      if (!user) return readHourStats(key);
      const { date, hour } = parseHourKey(key);
      const { data, error: hErr } = await supabase
        .from("hourly_activity")
        .select("calls, quotes, sales")
        .eq("user_id", user.id)
        .eq("date", date)
        .eq("hour", hour)
        .maybeSingle();

      if (hErr || !data) {
        return readHourStats(key);
      }

      return {
        calls: Number(data.calls ?? 0),
        quotes: Number(data.quotes ?? 0),
        sales: Number(data.sales ?? 0),
      };
    },
    [readHourStats, user],
  );

  const writeHourStats = useCallback(
    (key: string, next: { calls: number; quotes: number; sales: number }) => {
      if (!user) return;
      window.localStorage.setItem(
        `win-hour-${user.id}-${key}`,
        JSON.stringify(next),
      );
    },
    [user],
  );

  const persistHourStats = useCallback(
    async (
      key: string,
      next: { calls: number; quotes: number; sales: number },
    ) => {
      if (!user) return;
      const { date, hour } = parseHourKey(key);
      const won = next.calls >= 40 || next.quotes >= 1 || next.sales >= 1;
      await supabase.from("hourly_activity").upsert(
        {
          user_id: user.id,
          date,
          hour,
          calls: next.calls,
          quotes: next.quotes,
          sales: next.sales,
          won,
        },
        { onConflict: "user_id,date,hour" },
      );
    },
    [user],
  );

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => {
      const initialKey = getHourKey();
      hourKeyRef.current = initialKey;
      setHourKey(initialKey);
      void loadHourStatsForKey(initialKey).then((stats) => {
        setHourStats(stats);
      });

      if (hourIntervalRef.current) {
        window.clearInterval(hourIntervalRef.current);
      }

      hourIntervalRef.current = window.setInterval(() => {
        const nextKey = getHourKey();
        if (nextKey !== hourKeyRef.current) {
          hourKeyRef.current = nextKey;
          setHourKey(nextKey);
          void loadHourStatsForKey(nextKey).then((stats) => {
            setHourStats(stats);
          });
        }
      }, 30000);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (hourIntervalRef.current) {
        window.clearInterval(hourIntervalRef.current);
        hourIntervalRef.current = null;
      }
    };
  }, [user]);

  const updateHourStats = useCallback(
    (updates: Partial<{ calls: number; quotes: number; sales: number }>) => {
      if (!user) return;
      if (!hourKeyRef.current) {
        const fallbackKey = getHourKey();
        hourKeyRef.current = fallbackKey;
        setHourKey(fallbackKey);
      }
      setHourStats((prev) => {
        const next = {
          calls: Math.max(prev.calls + (updates.calls ?? 0), 0),
          quotes: Math.max(prev.quotes + (updates.quotes ?? 0), 0),
          sales: Math.max(prev.sales + (updates.sales ?? 0), 0),
        };
        writeHourStats(hourKeyRef.current, next);
        void persistHourStats(hourKeyRef.current, next);
        return next;
      });
    },
    [persistHourStats, user, writeHourStats],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      if (!user) return;
      setLoading(true);
      setError(null);

      const { data, error: aErr } = await supabase
        .from("daily_activities")
        .select(
          "id, user_id, date, no_answer_count, bad_contact_count, not_interested_count, callback_scheduled, quoted_callback_scheduled_count, quoted_lost_count, sales_count",
        )
        .eq("user_id", user.id)
        .eq("date", date)
        .maybeSingle();

      if (cancelled) return;
      if (aErr) {
        setError(aErr.message);
        setLoading(false);
        return;
      }

      if (data) {
        setActivity({
          no_answer_count: data.no_answer_count ?? 0,
          bad_contact_count: data.bad_contact_count ?? 0,
          not_interested_count: data.not_interested_count ?? 0,
          callback_scheduled: data.callback_scheduled ?? 0,
          quoted_callback_scheduled_count:
            data.quoted_callback_scheduled_count ?? 0,
          quoted_lost_count: data.quoted_lost_count ?? 0,
          sales_count: data.sales_count ?? 0,
        });
      } else {
        setActivity(emptyActivity());
      }
      setLoading(false);
    }

    loadActivity();
    return () => {
      cancelled = true;
    };
  }, [date, user]);

  useEffect(() => {
    if (!savedMessage) return;
    const timeout = window.setTimeout(() => {
      setSavedMessage(null);
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [savedMessage]);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    setFeedLoading(true);

    const { data: quotes, error: qErr } = await supabase
      .from("quotes_sales")
      .select(
        "id, policyholder, lob, quoted_date, written_date, written_premium, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (qErr) {
      setFeedLoading(false);
      return;
    }

    const { data: appts, error: aErr } = await supabase
      .from("daily_appointments")
      .select("id, policyholder, datetime, created_at, lob, policy_type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (aErr) {
      setFeedLoading(false);
      return;
    }

    const userName =
      `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
      profile?.email ||
      "Unknown";

    const quoteItems =
      quotes?.map<ActivityFeedItem>((q) => {
        const isSale = !!q.written_date && q.written_premium != null;
        const lobLabel = q.lob ? q.lob.toUpperCase() : "Quote";
        return {
          id: q.id,
          type: isSale ? "sale" : "quote",
          title: isSale ? "Sale written" : "Quote created",
          detail: `${q.policyholder} • ${lobLabel}`,
          userName,
          timestamp: q.created_at ?? q.written_date ?? q.quoted_date ?? "",
        };
      }) ?? [];

    const apptItems =
      appts?.map<ActivityFeedItem>((a) => ({
        id: a.id,
        type: "appointment",
        title: "Callback scheduled",
        detail: formatAppointmentDetail({
          policyholder: a.policyholder,
          lob: a.lob,
          policyType: a.policy_type,
        }),
        userName,
        timestamp: a.created_at ?? a.datetime ?? "",
      })) ?? [];

    const merged = [...quoteItems, ...apptItems].sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    setFeed(merged.slice(0, 12));
    setFeedLoading(false);
  }, [profile?.email, profile?.first_name, profile?.last_name, user]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  async function persistActivity(next: Omit<DailyActivity, "id">) {
    if (!user) return;
    const { error: saveErr } = await supabase
      .from("daily_activities")
      .upsert(next, { onConflict: "user_id,date" });

    if (saveErr) {
      setError(saveErr.message);
      return saveErr.message;
    }
    return null;
  }

  function applyDelta(key: ActivityCountKey, delta: number) {
    if (!user) return;
    const shouldOpenQuote = delta > 0 && isQuoteTriggerField(key);
    const shouldOpenCallback = delta > 0 && key === "callback_scheduled";

    if (shouldOpenQuote) {
      setPendingQuoteField(key);
      setPendingQuoteDelta(delta);
      setQuoteForm(emptyQuoteForm(date));
      setQuoteOpen(true);
      return;
    }

    if (shouldOpenCallback) {
      setPendingCallbackDelta(delta);
      setCallbackForm(emptyCallbackForm());
      setCallbackError(null);
      setCallbackOpen(true);
      return;
    }

    setActivity((prev) => {
      const next = {
        ...prev,
        [key]: Math.max((prev[key] ?? 0) + delta, 0),
      };

      void persistActivity({
        user_id: user.id,
        date,
        ...next,
      });

      return next;
    });

    const shouldUpdateHourStats =
      delta < 0 ||
      (!isQuoteTriggerField(key) && key !== "callback_scheduled");
    if (shouldUpdateHourStats) {
      updateHourStats(getHourStatsDelta(key, delta));
    }
  }

  function closeQuoteModal() {
    setPendingQuoteField(null);
    setPendingQuoteDelta(0);
    setQuoteOpen(false);
    setQuoteError(null);
  }

  function closeCallbackModal() {
    setPendingCallbackDelta(0);
    setCallbackOpen(false);
    setCallbackError(null);
  }

  function updateQuoteField<Key extends keyof QuoteForm>(
    key: Key,
    value: QuoteForm[Key],
  ) {
    setQuoteForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateCallbackField<Key extends keyof CallbackForm>(
    key: Key,
    value: CallbackForm[Key],
  ) {
    setCallbackForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveActivity() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSavedMessage(null);

    const payload: DailyActivity = {
      user_id: user.id,
      date,
      ...activity,
    };

    const saveErr = await persistActivity(payload);

    if (saveErr) {
      setSaving(false);
      return;
    }

    setSaving(false);
    setSavedMessage("Activity saved.");
  }

  async function saveQuote() {
    if (!user) return;
    setQuoteSaving(true);
    setQuoteError(null);

    const toUtcIso = (value: string) => new Date(value).toISOString();

    const payload = {
      user_id: user.id,
      policyholder: quoteForm.policyholder.trim(),
      lob: quoteForm.lob,
      policy_type: quoteForm.policy_type.trim() || null,
      zipcode: quoteForm.zipcode.trim() || null,
      quoted_date: quoteForm.quoted_date || null,
      quoted_premium: quoteForm.quoted_premium
        ? Number(quoteForm.quoted_premium)
        : null,
      written_date: quoteForm.written_date || null,
      written_premium: quoteForm.written_premium
        ? Number(quoteForm.written_premium)
        : null,
      issued_date: quoteForm.issued_date || null,
      issued_premium: quoteForm.issued_premium
        ? Number(quoteForm.issued_premium)
        : null,
    };

    if (!payload.policyholder) {
      setQuoteError("Policyholder is required.");
      setQuoteSaving(false);
      return;
    }

    if (
      pendingQuoteField === "quoted_callback_scheduled_count" &&
      !quoteForm.callback_datetime
    ) {
      setQuoteError("Callback date/time is required.");
      setQuoteSaving(false);
      return;
    }

    const { error: qErr } = await supabase.from("quotes_sales").insert(payload);

    if (qErr) {
      setQuoteError(qErr.message);
      setQuoteSaving(false);
      return;
    }

    if (pendingQuoteField === "quoted_callback_scheduled_count") {
      const { error: apptErr } = await supabase
        .from("daily_appointments")
        .insert({
          user_id: user.id,
          datetime: toUtcIso(quoteForm.callback_datetime),
          policyholder: payload.policyholder,
        });

      if (apptErr) {
        setQuoteError(apptErr.message);
        setQuoteSaving(false);
        return;
      }
    }

    if (!pendingQuoteField) {
      setQuoteSaving(false);
      setQuoteOpen(false);
      return;
    }

    const nextActivity = {
      ...activity,
      [pendingQuoteField]: Math.max(
        (activity[pendingQuoteField] ?? 0) + pendingQuoteDelta,
        0,
      ),
    };

    const activityErr = await persistActivity({
      user_id: user.id,
      date,
      ...nextActivity,
    });

    if (activityErr) {
      setQuoteError(activityErr);
      setQuoteSaving(false);
      return;
    }

    setActivity(nextActivity);
    setQuoteSaving(false);
    setPendingQuoteField(null);
    setPendingQuoteDelta(0);
    setQuoteOpen(false);

    if (pendingQuoteDelta > 0) {
      updateHourStats({
        calls: pendingQuoteDelta,
        sales: pendingQuoteField === "sales_count" ? 1 : 0,
        quotes: pendingQuoteField === "sales_count" ? 0 : 1,
      });
    }
    void loadFeed();
  }

  async function saveCallback() {
    if (!user) return;
    setCallbackSaving(true);
    setCallbackError(null);

    if (!callbackForm.policyholder.trim()) {
      setCallbackError("Policyholder is required.");
      setCallbackSaving(false);
      return;
    }

    if (!callbackForm.datetime) {
      setCallbackError("Callback date/time is required.");
      setCallbackSaving(false);
      return;
    }

    const { error: apptErr } = await supabase
      .from("daily_appointments")
      .insert({
        user_id: user.id,
        datetime: new Date(callbackForm.datetime).toISOString(),
        policyholder: callbackForm.policyholder.trim(),
      });

    if (apptErr) {
      setCallbackError(apptErr.message);
      setCallbackSaving(false);
      return;
    }

    const nextActivity = {
      ...activity,
      callback_scheduled: Math.max(
        (activity.callback_scheduled ?? 0) + pendingCallbackDelta,
        0,
      ),
    };

    const activityErr = await persistActivity({
      user_id: user.id,
      date,
      ...nextActivity,
    });

    if (activityErr) {
      setCallbackError(activityErr);
      setCallbackSaving(false);
      return;
    }

    setActivity(nextActivity);
    setCallbackSaving(false);
    setPendingCallbackDelta(0);
    setCallbackOpen(false);
    if (pendingCallbackDelta > 0) {
      updateHourStats({ calls: pendingCallbackDelta });
    }
    void loadFeed();
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}
      {savedMessage ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {savedMessage}
        </div>
      ) : null}
      {dncHolidayName ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          DO NOT CALL {dncHolidayName}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ActivityCard title="Call outcomes">
          <ActivityField
            label="No answer"
            value={activity.no_answer_count}
            onIncrement={(delta) => applyDelta("no_answer_count", delta)}
          />
          <ActivityField
            label="Bad contact"
            value={activity.bad_contact_count}
            onIncrement={(delta) => applyDelta("bad_contact_count", delta)}
          />
          <ActivityField
            label="Not interested"
            value={activity.not_interested_count}
            onIncrement={(delta) => applyDelta("not_interested_count", delta)}
          />
          <ActivityField
            label="Callback scheduled"
            value={activity.callback_scheduled}
            onIncrement={(delta) => applyDelta("callback_scheduled", delta)}
          />
          <ActivityField
            label="Quoted lost"
            value={activity.quoted_lost_count}
            onIncrement={(delta) => applyDelta("quoted_lost_count", delta)}
          />
          <ActivityField
            label="Quoted callback scheduled"
            value={activity.quoted_callback_scheduled_count}
            onIncrement={(delta) =>
              applyDelta("quoted_callback_scheduled_count", delta)
            }
          />
          <ActivityField
            label="Sales"
            value={activity.sales_count}
            onIncrement={(delta) => applyDelta("sales_count", delta)}
          />
        </ActivityCard>

        <div className="space-y-6">
          <WinTheHour
            hourKey={hourKey}
            calls={hourStats.calls}
            quotes={hourStats.quotes}
            sales={hourStats.sales}
          />
          <ActivityFeed items={feed} loading={feedLoading} />
        </div>
      </div>

      <CallbackModal
        isOpen={callbackOpen}
        saving={callbackSaving}
        error={callbackError}
        form={callbackForm}
        onClose={closeCallbackModal}
        onSave={saveCallback}
        onChange={updateCallbackField}
      />

      <QuoteModal
        isOpen={quoteOpen}
        saving={quoteSaving}
        error={quoteError}
        form={quoteForm}
        pendingField={pendingQuoteField}
        onClose={closeQuoteModal}
        onSave={saveQuote}
        onChange={updateQuoteField}
      />
    </div>
  );
}

function WinTheHour({
  hourKey,
  calls,
  quotes,
  sales,
}: {
  hourKey: string;
  calls: number;
  quotes: number;
  sales: number;
}) {
  const hourLabel = hourKey ? hourKey.split("-").slice(-1)[0] : "";
  const windowLabel = hourLabel ? `${hourLabel}:00-${hourLabel}:59` : "—";
  const won = calls >= 40 || quotes >= 1 || sales >= 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Win the Hour</h2>
        <span
          className={`text-xs font-semibold ${
            won ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {won ? "Won" : "Lost"}
        </span>
      </div>
      <div className="mt-1 text-xs text-slate-500">{windowLabel}</div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Calls
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {calls}
          </div>
          <div className="mt-1 text-xs text-slate-500">Goal: 40</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Quotes
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {quotes}
          </div>
          <div className="mt-1 text-xs text-slate-500">Goal: 1</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Sales
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {sales}
          </div>
          <div className="mt-1 text-xs text-slate-500">Goal: 1</div>
        </div>
      </div>
    </div>
  );
}
