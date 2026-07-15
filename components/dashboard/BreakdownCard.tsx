import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_CHROME } from "@/lib/visual-constants";

export type BreakdownItem = {
  key: string;
  label: React.ReactNode;
  count: number;
};

/**
 * Unified "breakdown" widget: rows of label · proportional bar · count,
 * with an optional footer slot (e.g. extremity / eye-laterality chips).
 * `items` should arrive pre-sorted descending by count.
 */
export function BreakdownCard({
  title,
  icon: Icon,
  items,
  total,
  barClassName,
  iconClassName,
  loading,
  emptyText = "No data yet",
  footer,
  className,
}: {
  title: string;
  icon: LucideIcon;
  items: BreakdownItem[];
  total: number;
  barClassName: string;
  iconClassName?: string;
  loading?: boolean;
  emptyText?: string;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl p-5",
        CARD_CHROME,
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className={cn("w-4 h-4", iconClassName ?? "text-slate-500")} />
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>
      {loading ? (
        <p className="text-sm text-slate-400">…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyText}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700 min-w-0 truncate">{item.label}</span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <span
                    className={cn("block h-full rounded-full", barClassName)}
                    style={{ width: `${total > 0 ? Math.max(6, Math.round((item.count / total) * 100)) : 0}%` }}
                  />
                </span>
                <span className="text-sm font-medium text-slate-600 w-5 text-right tabular-nums">
                  {item.count}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {footer ? <div className="mt-4 pt-4 border-t border-slate-100">{footer}</div> : null}
    </div>
  );
}
