import type { ActivityFeedItem } from "./types";
import { ActivityFeedItem as ActivityFeedItemRow } from "./ActivityFeedItem";

export function ActivityFeed({
  items,
  loading,
  title = "Recent activity",
  emptyLabel = "No recent activity yet.",
}: {
  items: ActivityFeedItem[];
  loading: boolean;
  title?: string;
  emptyLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {loading ? (
          <span className="text-xs text-slate-500">Refreshing…</span>
        ) : null}
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 && !loading ? (
          <div className="text-sm text-slate-600">{emptyLabel}</div>
        ) : null}
        {items.map((item) => (
          <ActivityFeedItemRow
            key={`${item.type}-${item.id}`}
            item={item}
          />
        ))}
      </div>
    </div>
  );
}
