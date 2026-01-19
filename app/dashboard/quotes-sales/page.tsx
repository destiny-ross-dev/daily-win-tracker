"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { useDashboardProfile } from "@/components/dashboard/DashboardProfileContext";
import { isoDateLocal, parseIsoDateLocal } from "@/lib/dates";
import {
  DateRangePicker,
  DateRangePreset,
} from "@/components/dashboard/DateRangePicker";
import { QuoteModal } from "@/components/dashboard/activity/QuoteModal";
import type { QuoteForm } from "@/components/dashboard/activity/types";
import { capitalizeFirstLetter } from "@/lib/displayHelpers";

type QuoteRow = {
  id: string;
  user_id: string;
  policyholder: string;
  lob: string | null;
  policy_type: string | null;
  business_type: string | null;
  quoted_date: string | null;
  quoted_premium: number | null;
  created_at: string | null;
};

type SaleRow = {
  id: string;
  user_id: string;
  policyholder: string;
  lob: string | null;
  policy_type: string | null;
  business_type: string | null;
  written_date: string | null;
  written_premium: number | null;
  created_at: string | null;
};

type Producer = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type QuoteField =
  | "quoted_callback_scheduled_count"
  | "quoted_lost_count"
  | "sales_count"
  | null;

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

export default function QuotesSalesPage() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useDashboardProfile();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(() =>
    emptyQuoteForm(isoDateLocal())
  );
  const [editId, setEditId] = useState<string | null>(null);
  const [editPendingField, setEditPendingField] = useState<QuoteField>(null);
  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [customStart, setCustomStart] = useState(isoDateLocal());
  const [customEnd, setCustomEnd] = useState(isoDateLocal());

  const isAdmin = profile?.role?.toLowerCase() === "admin";
  const agencyId = profile?.agency_id ?? null;

  const userNameById = useMemo(() => new Map<string, string>(), []);

  const range = useMemo(() => {
    const today = new Date();
    if (preset === "today") {
      const date = isoDateLocal(today);
      return { startDate: date, endDate: date };
    }
    if (preset === "this_week") {
      const start = new Date(today);
      const day = start.getDay() || 7;
      if (day !== 1) start.setDate(start.getDate() - (day - 1));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { startDate: isoDateLocal(start), endDate: isoDateLocal(end) };
    }
    if (preset === "this_month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { startDate: isoDateLocal(start), endDate: isoDateLocal(end) };
    }
    return { startDate: customStart, endDate: customEnd };
  }, [customEnd, customStart, preset]);

  const coverageLabel = useMemo(() => {
    const start = format(parseIsoDateLocal(range.startDate), "MMM d, yyyy");
    const end = format(parseIsoDateLocal(range.endDate), "MMM d, yyyy");
    return start === end ? start : `${start} → ${end}`;
  }, [range.endDate, range.startDate]);

  const loadData = useCallback(async () => {
    if (!user || profileLoading) return;
    setLoading(true);
    setError(null);

    let userIds: string[] = [user.id];

    if (isAdmin && agencyId) {
      const { data: producers, error: pErr } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("agency_id", agencyId);

      if (pErr) {
        setError(pErr.message);
        setLoading(false);
        return;
      }

      const mapped = (producers ?? []) as Producer[];
      userIds = mapped.map((p) => p.id);
      userNameById.clear();
      mapped.forEach((p) => {
        const name =
          `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unknown";
        userNameById.set(p.id, name);
      });
    } else {
      userNameById.clear();
      const name =
        `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
        user.email ||
        "Unknown";
      userNameById.set(user.id, name);
    }

    if (userIds.length === 0) {
      setQuotes([]);
      setSales([]);
      setLoading(false);
      return;
    }

    const { data: quoteRows, error: qErr } = await supabase
      .from("quotes_sales")
      .select(
        "id, user_id, policyholder, lob, policy_type, business_type, quoted_date, quoted_premium, created_at",
      )
      .not("quoted_date", "is", null)
      .is("written_date", null)
      .is("written_premium", null)
      .is("issued_date", null)
      .is("issued_premium", null)
      .gte("quoted_date", range.startDate)
      .lte("quoted_date", range.endDate)
      .in("user_id", userIds)
      .order("quoted_date", { ascending: false })
      .limit(100);

    if (qErr) {
      setError(qErr.message);
      setLoading(false);
      return;
    }

    const { data: saleRows, error: sErr } = await supabase
      .from("quotes_sales")
      .select(
        "id, user_id, policyholder, lob, policy_type, business_type, written_date, written_premium, created_at",
      )
      .not("written_date", "is", null)
      .gte("written_date", range.startDate)
      .lte("written_date", range.endDate)
      .in("user_id", userIds)
      .order("written_date", { ascending: false })
      .limit(100);

    if (sErr) {
      setError(sErr.message);
      setLoading(false);
      return;
    }

    setQuotes((quoteRows ?? []) as QuoteRow[]);
    setSales((saleRows ?? []) as SaleRow[]);
    setLoading(false);
  }, [
    agencyId,
    isAdmin,
    profile?.first_name,
    profile?.last_name,
    profileLoading,
    range.endDate,
    range.startDate,
    user,
    userNameById,
  ]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const formatDate = (value: string | null) =>
    value ? format(parseISO(value), "MMM d, yyyy") : "—";

  const formatPremium = (value: number | null) =>
    value == null ? "—" : value.toFixed(2);

  const quoteColSpan = isAdmin ? 7 : 6;
  const saleColSpan = isAdmin ? 7 : 6;

  const handleEdit = async (type: "quote" | "sale", id: string) => {
    setEditError(null);

    const { data, error: qErr } = await supabase
      .from("quotes_sales")
      .select(
        "id, policyholder, lob, policy_type, zipcode, quoted_date, quoted_premium, written_date, written_premium, issued_date, issued_premium",
      )
      .eq("id", id)
      .maybeSingle();

    if (qErr || !data) {
      setError(qErr?.message ?? "Unable to load quote.");
      return;
    }

    const lobValue =
      data.lob === "auto" ||
      data.lob === "fire" ||
      data.lob === "life" ||
      data.lob === "health"
        ? data.lob
        : "auto";

    setEditForm({
      policyholder: data.policyholder ?? "",
      lob: lobValue,
      policy_type: data.policy_type ?? "",
      zipcode: data.zipcode ?? "",
      callback_datetime: "",
      quoted_date: data.quoted_date ?? "",
      quoted_premium:
        data.quoted_premium != null ? String(data.quoted_premium) : "",
      written_date: data.written_date ?? "",
      written_premium:
        data.written_premium != null ? String(data.written_premium) : "",
      issued_date: data.issued_date ?? "",
      issued_premium:
        data.issued_premium != null ? String(data.issued_premium) : "",
    });
    setEditId(data.id);
    setEditPendingField(type === "sale" ? "sales_count" : null);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editId) return;
    if (!editForm.policyholder.trim()) {
      setEditError("Policyholder is required.");
      return;
    }

    setEditSaving(true);
    setEditError(null);

    const payload = {
      policyholder: editForm.policyholder.trim(),
      lob: editForm.lob,
      policy_type: editForm.policy_type.trim() || null,
      zipcode: editForm.zipcode.trim() || null,
      quoted_date: editForm.quoted_date || null,
      quoted_premium: editForm.quoted_premium
        ? Number(editForm.quoted_premium)
        : null,
      written_date: editForm.written_date || null,
      written_premium: editForm.written_premium
        ? Number(editForm.written_premium)
        : null,
      issued_date: editForm.issued_date || null,
      issued_premium: editForm.issued_premium
        ? Number(editForm.issued_premium)
        : null,
    };

    const { error: saveErr } = await supabase
      .from("quotes_sales")
      .update(payload)
      .eq("id", editId);

    if (saveErr) {
      setEditError(saveErr.message);
      setEditSaving(false);
      return;
    }

    setEditSaving(false);
    setEditOpen(false);
    setEditId(null);
    void loadData();
  };

  const handleEditChange = <Key extends keyof QuoteForm>(
    key: Key,
    value: QuoteForm[Key]
  ) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Quotes &amp; Sales
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Latest quotes and written business.
        </p>
      </div>

      <DateRangePicker
        preset={preset}
        onPresetChange={setPreset}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={setCustomStart}
        onCustomEndChange={setCustomEnd}
        summary={
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Showing: {coverageLabel}
          </span>
        }
      />

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Quotes</h2>
          {loading ? (
            <span className="text-xs text-slate-500">Loading…</span>
          ) : null}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm text-slate-700">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {isAdmin ? (
                  <th className="px-3 py-2">Agent</th>
                ) : null}
                <th className="px-3 py-2">Policyholder</th>
                <th className="px-3 py-2">LOB</th>
                <th className="px-3 py-2">Policy type</th>
                <th className="px-3 py-2">Business type</th>
                <th className="px-3 py-2">Quoted date</th>
                <th className="px-3 py-2 text-right">Quoted premium</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 && !loading ? (
                <tr>
                  <td
                    className="px-3 py-4 text-sm text-slate-500"
                    colSpan={quoteColSpan}
                  >
                    No quotes found.
                  </td>
                </tr>
              ) : null}
              {quotes.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  {isAdmin ? (
                    <td className="px-3 py-2">
                      {userNameById.get(row.user_id) ?? "Unknown"}
                    </td>
                  ) : null}
                  <td className="px-3 py-2">{row.policyholder}</td>
                  <td className="px-3 py-2">{row.lob?.toUpperCase() ?? "—"}</td>
                  <td className="px-3 py-2">{row.policy_type ?? "—"}</td>
                  <td className="px-3 py-2">
                    {row.business_type
                      ? capitalizeFirstLetter(row.business_type)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {formatDate(row.quoted_date)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatPremium(row.quoted_premium)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleEdit("quote", row.id)}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Sales</h2>
          {loading ? (
            <span className="text-xs text-slate-500">Loading…</span>
          ) : null}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm text-slate-700">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {isAdmin ? (
                  <th className="px-3 py-2">Agent</th>
                ) : null}
                <th className="px-3 py-2">Policyholder</th>
                <th className="px-3 py-2">LOB</th>
                <th className="px-3 py-2">Policy type</th>
                <th className="px-3 py-2">Business type</th>
                <th className="px-3 py-2">Written date</th>
                <th className="px-3 py-2 text-right">Written premium</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 && !loading ? (
                <tr>
                  <td
                    className="px-3 py-4 text-sm text-slate-500"
                    colSpan={saleColSpan}
                  >
                    No sales found.
                  </td>
                </tr>
              ) : null}
              {sales.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  {isAdmin ? (
                    <td className="px-3 py-2">
                      {userNameById.get(row.user_id) ?? "Unknown"}
                    </td>
                  ) : null}
                  <td className="px-3 py-2">{row.policyholder}</td>
                  <td className="px-3 py-2">{row.lob?.toUpperCase() ?? "—"}</td>
                  <td className="px-3 py-2">{row.policy_type ?? "—"}</td>
                  <td className="px-3 py-2">
                    {row.business_type
                      ? capitalizeFirstLetter(row.business_type)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {formatDate(row.written_date)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatPremium(row.written_premium)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleEdit("sale", row.id)}
                      className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <QuoteModal
        isOpen={editOpen}
        saving={editSaving}
        error={editError}
        form={editForm}
        pendingField={editPendingField}
        showSalesFields
        onClose={() => {
          setEditOpen(false);
          setEditId(null);
          setEditError(null);
        }}
        onSave={handleEditSave}
        onChange={handleEditChange}
      />
    </div>
  );
}
