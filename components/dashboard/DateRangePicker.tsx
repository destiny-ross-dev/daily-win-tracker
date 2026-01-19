"use client";

import type { ReactNode } from "react";

export type DateRangePreset = "today" | "this_week" | "this_month" | "custom";

type DateRangePickerProps = {
  preset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  summary?: ReactNode;
};

export function DateRangePicker({
  preset,
  onPresetChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  summary,
}: DateRangePickerProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-sm font-semibold text-slate-700">Date Range</div>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "today", label: "Today" },
              { id: "this_week", label: "This Week" },
              { id: "this_month", label: "This Month" },
              { id: "custom", label: "Custom" },
            ] as const
          ).map((option) => {
            const isActive = preset === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onPresetChange(option.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {summary ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
            {summary}
          </div>
        ) : null}
      </div>

      {preset === "custom" ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-600">
            Start date
            <input
              type="date"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
              value={customStart}
              onChange={(event) => {
                const next = event.target.value || customStart;
                onCustomStartChange(next);
                if (next > customEnd) {
                  onCustomEndChange(next);
                }
              }}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            End date
            <input
              type="date"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
              value={customEnd}
              onChange={(event) => {
                const next = event.target.value || customEnd;
                onCustomEndChange(next);
                if (next < customStart) {
                  onCustomStartChange(next);
                }
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
