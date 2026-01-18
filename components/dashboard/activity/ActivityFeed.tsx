import { format, parseISO } from "date-fns";
import type { ActivityFeedItem } from "./types";

export function ActivityFeed({
  items,
  loading,
}: {
  items: ActivityFeedItem[];
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Recent activity
        </h2>
        {loading ? (
          <span className="text-xs text-slate-500">Refreshing…</span>
        ) : null}
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 && !loading ? (
          <div className="text-sm text-slate-600">No recent activity yet.</div>
        ) : null}
        {items.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            className="rounded-xl border border-slate-100 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {item.title}
                </div>
                <div className="mt-1 text-xs text-slate-500">{item.detail}</div>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {item.userName}
                </div>
                <div className="text-xs text-slate-500">
                  {item.timestamp
                    ? format(parseISO(item.timestamp), "MMM d, h:mm a")
                    : "—"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
