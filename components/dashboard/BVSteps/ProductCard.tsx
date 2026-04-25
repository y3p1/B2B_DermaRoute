import React from "react";

export function ProductCard({ name }: { name: string }) {
  return (
    <div className="border border-blue-300 bg-blue-50 rounded-lg p-4 flex items-center justify-center min-h-[80px]">
      <span className="font-bold text-lg text-center w-full">{name}</span>
    </div>
  );
}
