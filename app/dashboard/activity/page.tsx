"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  displayDateWeekdayMonthDayYear,
  isoDateLocal,
  parseIsoDateLocal,
} from "@/lib/dates";
import { useAuth } from "@/components/providers/AuthProvider";
import { useDashboardProfile } from "@/components/dashboard/DashboardProfileContext";
import { ActivityCard } from "@/components/dashboard/activity/ActivityCard";
import { ActivityFeed } from "@/components/dashboard/activity/ActivityFeed";
import { ActivityField } from "@/components/dashboard/activity/ActivityField";
import { CallbackModal } from "@/components/dashboard/activity/CallbackModal";
import { QuoteModal } from "@/components/dashboard/activity/QuoteModal";
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

function isQuoteTriggerField(
  value: ActivityCountKey
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

  useEffect(() => {
    let cancelled = false;

    async function loadActivity() {
      if (!user) return;
      setLoading(true);
      setError(null);

      const { data, error: aErr } = await supabase
        .from("daily_activities")
        .select(
          "id, user_id, date, no_answer_count, bad_contact_count, not_interested_count, callback_scheduled, quoted_callback_scheduled_count, quoted_lost_count, sales_count"
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
      .select("id, policyholder, lob, quoted_date, issued_date, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (qErr) {
      setFeedLoading(false);
      return;
    }

    const { data: appts, error: aErr } = await supabase
      .from("daily_appointments")
      .select("id, policyholder, datetime, created_at")
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
        const isIssued = !!q.issued_date;
        const lobLabel = q.lob ? q.lob.toUpperCase() : "Quote";
        return {
          id: q.id,
          type: isIssued ? "sale" : "quote",
          title: isIssued ? "Sale issued" : "Quote created",
          detail: `${q.policyholder} • ${lobLabel}`,
          userName,
          timestamp: q.created_at ?? q.issued_date ?? q.quoted_date ?? "",
        };
      }) ?? [];

    const apptItems =
      appts?.map<ActivityFeedItem>((a) => ({
        id: a.id,
        type: "appointment",
        title: "Callback scheduled",
        detail: a.policyholder,
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
    value: QuoteForm[Key]
  ) {
    setQuoteForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateCallbackField<Key extends keyof CallbackForm>(
    key: Key,
    value: CallbackForm[Key]
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
        0
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
        0
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
    void loadFeed();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Activity Log
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Date: {displayDateWeekdayMonthDayYear(parseIsoDateLocal(date))}
            </p>
          </div>
          <button
            type="button"
            onClick={saveActivity}
            disabled={saving || loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? "Saving..." : "Save activity"}
          </button>
        </div>
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
      </div>

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

        <ActivityFeed items={feed} loading={feedLoading} />
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
