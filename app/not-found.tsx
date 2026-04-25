"use client";

import IntegrityTissueLogo from "@/components/IntegrityTissueLogo";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a1a2e] px-4">
      <div className="w-full max-w-lg flex flex-col items-center">
        <IntegrityTissueLogo />
        <div className="flex flex-col items-center mb-8">
          <svg
            width="100"
            height="100"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mb-2"
          >
            <circle cx="60" cy="60" r="60" fill="#fff" fillOpacity="0.04" />
            <path
              d="M40 80c0-11.046 8.954-20 20-20s20 8.954 20 20"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <ellipse cx="50" cy="55" rx="4" ry="6" fill="#fff" />
            <ellipse cx="70" cy="55" rx="4" ry="6" fill="#fff" />
            <rect x="54" y="70" width="12" height="4" rx="2" fill="#fff" />
          </svg>
        </div>
        <h1 className="text-6xl font-extrabold text-white mb-2 tracking-tight">
          404
        </h1>
        <h2 className="text-2xl font-semibold text-white/80 mb-2">
          Page Not Found
        </h2>
        <p className="text-white/60 mb-8 max-w-md">
          Sorry, the page you are looking for doesn’t exist or has been moved.
          <br />
          If you think this is a mistake, please contact support.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-white text-black rounded-lg font-semibold shadow hover:bg-neutral-200 transition w-full sm:w-auto"
          >
            Go Back
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-black border border-white text-white rounded-lg font-semibold shadow hover:bg-neutral-900 transition w-full sm:w-auto text-center"
          >
            Go Home
          </Link>
        </div>
      </div>
      <footer className="mt-16 text-white/40 text-xs text-center w-full">
        &copy; {new Date().getFullYear()} Integrity Tissue. All rights reserved.
      </footer>
    </div>
  );
}
