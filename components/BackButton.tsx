import React from "react";

interface BackButtonProps {
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}

export default function BackButton({
  onClick,
  className = "",
  children,
}: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-4 flex items-center gap-2 text-gray-600 hover:text-black text-base font-medium bg-transparent border-none cursor-pointer ${className}`}
    >
      <span aria-hidden="true">←</span> {children || "Back"}
    </button>
  );
}
