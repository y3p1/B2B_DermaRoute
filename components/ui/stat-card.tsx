import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_CHROME } from "@/lib/visual-constants";

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
        "bg-white rounded-xl p-5",
        CARD_CHROME,
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
