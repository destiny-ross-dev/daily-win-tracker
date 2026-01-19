"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  displayDateWeekdayMonthDayYear,
  isoDateLocal,
  parseIsoDateLocal,
} from "@/lib/dates";
import { useAuth } from "@/components/providers/AuthProvider";
import { useDashboardProfile } from "@/components/dashboard/DashboardProfileContext";
import { useDncDay } from "@/components/dashboard/useDncDay";

type DailyGoals = {
  id?: string;
  user_id: string;
  date: string;
  auto_quotes: number | null;
  fire_quotes: number | null;
  life_quotes: number | null;
  health_quotes: number | null;
  auto_sales: number | null;
  fire_sales: number | null;
  life_sales: number | null;
  health_sales: number | null;
  reviews: number | null;
  referrals: number | null;
};

const emptyGoals = (): Omit<DailyGoals, "user_id" | "date"> => ({
  auto_quotes: 0,
  fire_quotes: 0,
  life_quotes: 0,
  health_quotes: 0,
  auto_sales: 0,
  fire_sales: 0,
  life_sales: 0,
  health_sales: 0,
  reviews: 0,
  referrals: 0,
});

export default function DailyGoalsPage() {
  const { user } = useAuth();
  const { profile } = useDashboardProfile();
  const date = useMemo(() => isoDateLocal(), []);

  const [goals, setGoals] = useState(emptyGoals());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const { holidayName: dncHolidayName } = useDncDay({
    agencyId: profile?.agency_id ?? null,
    date,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadGoals() {
      if (!user) return;
      setLoading(true);
      setError(null);

      const { data, error: gErr } = await supabase
        .from("daily_goals")
        .select(
          "id, user_id, date, auto_quotes, fire_quotes, life_quotes, health_quotes, auto_sales, fire_sales, life_sales, health_sales, reviews, referrals",
        )
        .eq("user_id", user.id)
        .eq("date", date)
        .maybeSingle();

      if (cancelled) return;
      if (gErr) {
        setError(gErr.message);
        setLoading(false);
        return;
      }

      if (data) {
        setGoals({
          auto_quotes: data.auto_quotes ?? 0,
          fire_quotes: data.fire_quotes ?? 0,
          life_quotes: data.life_quotes ?? 0,
          health_quotes: data.health_quotes ?? 0,
          auto_sales: data.auto_sales ?? 0,
          fire_sales: data.fire_sales ?? 0,
          life_sales: data.life_sales ?? 0,
          health_sales: data.health_sales ?? 0,
          reviews: data.reviews ?? 0,
          referrals: data.referrals ?? 0,
        });
      } else {
        setGoals(emptyGoals());
      }
      setLoading(false);
    }

    loadGoals();
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

  function updateGoal(key: keyof typeof goals, value: string) {
    const next = value === "" ? 0 : Number(value);
    setGoals((prev) => ({
      ...prev,
      [key]: Number.isFinite(next) ? next : 0,
    }));
  }

  async function saveGoals() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSavedMessage(null);

    const payload: DailyGoals = {
      user_id: user.id,
      date,
      ...goals,
    };

    const { error: saveErr } = await supabase
      .from("daily_goals")
      .upsert(payload, { onConflict: "user_id,date" });

    if (saveErr) {
      setError(saveErr.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSavedMessage("Goals saved.");
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <GoalCard title="Quotes">
          <GoalField
            label="Auto quotes"
            value={goals.auto_quotes}
            onChange={(value) => updateGoal("auto_quotes", value)}
          />
          <GoalField
            label="Fire quotes"
            value={goals.fire_quotes}
            onChange={(value) => updateGoal("fire_quotes", value)}
          />
          <GoalField
            label="Life quotes"
            value={goals.life_quotes}
            onChange={(value) => updateGoal("life_quotes", value)}
          />
          <GoalField
            label="Health quotes"
            value={goals.health_quotes}
            onChange={(value) => updateGoal("health_quotes", value)}
          />
        </GoalCard>

        <GoalCard title="Sales">
          <GoalField
            label="Auto sales"
            value={goals.auto_sales}
            onChange={(value) => updateGoal("auto_sales", value)}
          />
          <GoalField
            label="Fire sales"
            value={goals.fire_sales}
            onChange={(value) => updateGoal("fire_sales", value)}
          />
          <GoalField
            label="Life sales"
            value={goals.life_sales}
            onChange={(value) => updateGoal("life_sales", value)}
          />
          <GoalField
            label="Health sales"
            value={goals.health_sales}
            onChange={(value) => updateGoal("health_sales", value)}
          />
        </GoalCard>

        <GoalCard title="Other">
          <GoalField
            label="Reviews"
            value={goals.reviews}
            onChange={(value) => updateGoal("reviews", value)}
          />
          <GoalField
            label="Referrals"
            value={goals.referrals}
            onChange={(value) => updateGoal("referrals", value)}
          />
        </GoalCard>
      </div>
    </div>
  );
}

function GoalCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function GoalField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <input
        type="number"
        min={0}
        value={value ?? 0}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
      />
    </label>
  );
}
