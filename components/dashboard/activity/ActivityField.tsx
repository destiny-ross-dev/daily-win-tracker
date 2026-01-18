export function ActivityField({
  label,
  value,
  onIncrement,
}: {
  label: string;
  value: number | null;
  onIncrement: (delta: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-5 text-center">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onIncrement(-1)}
          className="shrink-0 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
          aria-label={`Decrement ${label}`}
        >
          -1
        </button>
        <div className="text-3xl font-semibold text-slate-900 tabular-nums">
          {value ?? 0}
        </div>
        <button
          type="button"
          onClick={() => onIncrement(1)}
          className="shrink-0 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
          aria-label={`Increment ${label}`}
        >
          +1
        </button>
      </div>
    </div>
  );
}
