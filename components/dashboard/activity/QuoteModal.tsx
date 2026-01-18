import { DateField, SelectField, TextField } from "./Fields";
import type { QuoteForm } from "./types";

type QuoteField = "quoted_callback_scheduled_count" | "quoted_lost_count" | "sales_count" | null;

export function QuoteModal({
  isOpen,
  saving,
  error,
  form,
  pendingField,
  onClose,
  onSave,
  onChange,
}: {
  isOpen: boolean;
  saving: boolean;
  error: string | null;
  form: QuoteForm;
  pendingField: QuoteField;
  onClose: () => void;
  onSave: () => void;
  onChange: <Key extends keyof QuoteForm>(key: Key, value: QuoteForm[Key]) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Quote details
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Capture the quote so it shows up in metrics.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField
            label="Policyholder"
            value={form.policyholder}
            onChange={(value) => onChange("policyholder", value)}
          />
          <SelectField
            label="Line of business"
            value={form.lob}
            onChange={(value) => onChange("lob", value as QuoteForm["lob"])}
            options={[
              { value: "auto", label: "Auto" },
              { value: "fire", label: "Fire" },
              { value: "life", label: "Life" },
              { value: "health", label: "Health" },
            ]}
          />
          <TextField
            label="Policy type"
            value={form.policy_type}
            onChange={(value) => onChange("policy_type", value)}
          />
          <TextField
            label="Zipcode"
            inputMode="numeric"
            value={form.zipcode}
            onChange={(value) => onChange("zipcode", value)}
          />
          <DateField
            label="Quoted date"
            value={form.quoted_date}
            onChange={(value) => onChange("quoted_date", value)}
          />
          <TextField
            label="Quoted premium"
            inputMode="decimal"
            value={form.quoted_premium}
            onChange={(value) => onChange("quoted_premium", value)}
          />
          {pendingField === "quoted_callback_scheduled_count" ? (
            <label className="text-xs font-medium text-slate-600">
              Callback date/time
              <input
                type="datetime-local"
                value={form.callback_datetime}
                onChange={(event) =>
                  onChange("callback_datetime", event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
              />
            </label>
          ) : null}
          {pendingField === "sales_count" ? (
            <>
              <DateField
                label="Written date"
                value={form.written_date}
                onChange={(value) => onChange("written_date", value)}
              />
              <TextField
                label="Written premium"
                inputMode="decimal"
                value={form.written_premium}
                onChange={(value) => onChange("written_premium", value)}
              />
              <DateField
                label="Issued date"
                value={form.issued_date}
                onChange={(value) => onChange("issued_date", value)}
              />
              <TextField
                label="Issued premium"
                inputMode="decimal"
                value={form.issued_premium}
                onChange={(value) => onChange("issued_premium", value)}
              />
            </>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saving ? "Saving..." : "Save quote"}
          </button>
        </div>
      </div>
    </div>
  );
}
