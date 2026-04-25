import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const practices = [
  "All Practices",
  "Atlanta Wound Care Center",
  "Macon Podiatry Associates",
];

const statuses = [
  "All Status",
  "pending",
  "downloaded",
];

const DashboardFilters: React.FC = () => (
  <div className="flex flex-col gap-4 mb-6">
    <div className="flex flex-col md:flex-row gap-4">
      {/* All Practices Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-48 justify-between bg-white border border-gray-300 rounded-lg px-4 py-2 text-base font-medium text-[#18192B] shadow-none focus:ring-2 focus:ring-[#00C48C] focus:border-[#00C48C]"
          >
            All Practices
            <svg className="ml-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48">
          {practices.map((practice) => (
            <DropdownMenuItem key={practice}>{practice}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* All Status Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-40 justify-between bg-white border border-gray-300 rounded-lg px-4 py-2 text-base font-medium text-[#18192B] shadow-none focus:ring-2 focus:ring-[#00C48C] focus:border-[#00C48C]"
          >
            All Status
            <svg className="ml-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-40">
          {statuses.map((status) => (
            <DropdownMenuItem key={status}>{status}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
);

export default DashboardFilters;
