import { ClipboardList, Clock, CheckCircle, CheckCheck } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

export function DashboardStatsRow({
  total,
  counts,
  loading,
  totalLabel,
  totalIconClassName,
  totalValueClassName,
}: {
  total: number;
  counts: { pending: number; approved: number; completed: number };
  loading?: boolean;
  totalLabel: string;
  totalIconClassName: string;
  totalValueClassName: string;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label={totalLabel} value={total} loading={loading} icon={ClipboardList} iconClassName={totalIconClassName} valueClassName={totalValueClassName} />
      <StatCard label="Pending" value={counts.pending} loading={loading} icon={Clock} iconClassName="bg-amber-50 text-amber-600" valueClassName="text-amber-700" />
      <StatCard label="Approved" value={counts.approved} loading={loading} icon={CheckCircle} iconClassName="bg-sky-50 text-sky-600" valueClassName="text-sky-700" />
      <StatCard label="Completed" value={counts.completed} loading={loading} icon={CheckCheck} iconClassName="bg-emerald-50 text-emerald-700" valueClassName="text-emerald-700" />
    </div>
  );
}
