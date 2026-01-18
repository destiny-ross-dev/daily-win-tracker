import { TextField } from "./Fields";
import type { CallbackForm } from "./types";

export function CallbackModal({
  isOpen,
  saving,
  error,
  form,
  onClose,
  onSave,
  onChange,
}: {
  isOpen: boolean;
  saving: boolean;
  error: string | null;
  form: CallbackForm;
  onClose: () => void;
  onSave: () => void;
  onChange: <Key extends keyof CallbackForm>(
    key: Key,
    value: CallbackForm[Key]
  ) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Schedule callback
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Log a callback appointment for this outcome.
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

        <div className="mt-4 grid gap-4">
          <TextField
            label="Policyholder"
            value={form.policyholder}
            onChange={(value) => onChange("policyholder", value)}
          />
          <label className="text-xs font-medium text-slate-600">
            Callback date/time
            <input
              type="datetime-local"
              value={form.datetime}
              onChange={(event) => onChange("datetime", event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
          </label>
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
            {saving ? "Saving..." : "Save callback"}
          </button>
        </div>
      </div>
    </div>
  );
}
