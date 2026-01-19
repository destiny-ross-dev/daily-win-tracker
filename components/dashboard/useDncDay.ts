"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type UseDncDayArgs = {
  agencyId: string | null;
  date: string;
};

export function useDncDay({ agencyId, date }: UseDncDayArgs) {
  const [holidayName, setHolidayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDncDay() {
      if (!agencyId) {
        setHolidayName(null);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: dncErr } = await supabase
        .from("agency_settings_dnc_days")
        .select("holiday_name")
        .eq("agency_id", agencyId)
        .eq("date", date)
        .maybeSingle();

      if (cancelled) return;
      if (dncErr) {
        setHolidayName(null);
        setLoading(false);
        setError(dncErr.message);
        return;
      }

      setHolidayName(data?.holiday_name ?? null);
      setLoading(false);
    }

    void loadDncDay();
    return () => {
      cancelled = true;
    };
  }, [agencyId, date]);

  return { holidayName, loading, error };
}
