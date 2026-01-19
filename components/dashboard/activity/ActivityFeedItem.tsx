"use client";

import { format, parseISO } from "date-fns";
import type { ActivityFeedItem as ActivityFeedItemType } from "./types";

export function ActivityFeedItem({ item }: { item: ActivityFeedItemType }) {
  return (
    <div className="rounded-xl border border-slate-100 px-4 py-3">
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
  );
}
