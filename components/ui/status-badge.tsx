import * as React from "react";
import { cn } from "@/lib/utils";
import { humanizeLabel } from "@/lib/format";

/**
 * Canonical status display system — the single source of truth for every
 * status pill in the app. One color per status, everywhere.
 *
 * Viewers:
 *  - "provider": pending_review renders as Pending, rejected as Denied.
 *  - "staff":    pending_review stays distinct ("Pending Review"); rejected → Denied.
 */
export type StatusViewer = "provider" | "staff";

type StatusMeta = { label: string; classes: string };

const STATUS_META: Record<string, StatusMeta> = {
  pending: { label: "Pending", classes: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  pending_review: { label: "Pending Review", classes: "bg-orange-50 text-orange-800 ring-orange-600/20" },
  approved: { label: "Approved", classes: "bg-sky-50 text-sky-800 ring-sky-600/20" },
  shipped: { label: "Shipped", classes: "bg-violet-50 text-violet-800 ring-violet-600/20" },
  completed: { label: "Completed", classes: "bg-emerald-50 text-emerald-800 ring-emerald-600/20" },
  denied: { label: "Denied", classes: "bg-red-50 text-red-800 ring-red-600/20" },
  downloaded: { label: "Downloaded", classes: "bg-slate-100 text-slate-600 ring-slate-500/20" },
  cancelled: { label: "Cancelled", classes: "bg-slate-50 text-slate-500 ring-slate-400/20" },
  delivered: { label: "Delivered", classes: "bg-emerald-50 text-emerald-800 ring-emerald-600/20" },
  signed: { label: "Signed", classes: "bg-sky-50 text-sky-800 ring-sky-600/20" },
  expired: { label: "Expired", classes: "bg-red-50 text-red-800 ring-red-600/20" },
  revoked: { label: "Revoked", classes: "bg-slate-50 text-slate-500 ring-slate-400/20" },
};

const UNKNOWN_CLASSES = "bg-slate-50 text-slate-500 ring-slate-400/20";

/** Resolve a raw DB status to its canonical display status for a viewer. */
export function canonicalStatus(status: string, viewer: StatusViewer): string {
  const s = status.toLowerCase();
  if (s === "rejected") return "denied";
  if (s === "pending_review" && viewer === "provider") return "pending";
  return s;
}

/** Resolved label + pill classes, with a graceful fallback for unknown statuses. */
export function statusMeta(status: string, viewer: StatusViewer = "provider"): StatusMeta {
  const canonical = canonicalStatus(status, viewer);
  return STATUS_META[canonical] ?? { label: humanizeLabel(status), classes: UNKNOWN_CLASSES };
}

export function countByCanonicalStatus(
  items: { status: string }[],
  viewer: StatusViewer = "provider",
) {
  const counts = { pending: 0, approved: 0, completed: 0 };
  for (const item of items) {
    const s = canonicalStatus(item.status, viewer);
    if (s in counts) counts[s as keyof typeof counts]++;
  }
  return counts;
}

const SIZE_CLASSES = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
} as const;

export function StatusBadge({
  status,
  viewer = "provider",
  size = "sm",
  className,
}: {
  status: string;
  viewer?: StatusViewer;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const meta = statusMeta(status, viewer);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset whitespace-nowrap",
        meta.classes,
        SIZE_CLASSES[size],
        className,
      )}
    >
      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </span>
  );
}
