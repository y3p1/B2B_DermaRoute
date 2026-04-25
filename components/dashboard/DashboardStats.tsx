import React from "react";

type Props = {
  total: number;
  pending: number;
  approved: number;
};

const DashboardStats: React.FC<Props> = ({ total, pending, approved }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
    {[{ label: "Total BVs", value: total }, { label: "Pending", value: pending }, { label: "Approved", value: approved }].map(
      (stat) => (
      <div key={stat.label} className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
        <span className="text-sm text-gray-500 mb-1">{stat.label}</span>
        <span className="text-2xl font-bold text-[#18192B]">{stat.value}</span>
      </div>
      )
    )}
  </div>
);

export default DashboardStats;
