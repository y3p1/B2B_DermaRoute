import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Unified dashboard stat card. Icon tile tint carries the track accent or a
 * status tint; the card chrome is identical everywhere.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName,
  valueClassName,
  loading,
  className,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconClassName?: string;
  valueClassName?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl p-5 ring-1 ring-slate-900/5",
        "shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_12px_-4px_rgb(15_23_42/0.06)]",
        className,
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            iconClassName ?? "bg-slate-50 text-slate-600",
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
      <p className={cn("text-2xl font-bold text-slate-900", valueClassName)}>
        {loading ? "…" : value}
      </p>
    </div>
  );
}
