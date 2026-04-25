import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      <header className="bg-white shadow border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-sm">Return to App</span>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-gray-400" />
            <span className="font-bold text-gray-700 tracking-tight">Legal & Compliance</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto mt-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 sm:p-12 shadow-sm border border-gray-200 rounded-xl">
          {children}
        </div>
      </main>

      <footer className="max-w-4xl mx-auto mt-12 text-center text-sm text-gray-500 flex flex-col sm:flex-row gap-4 items-center justify-center">
        <Link href="/legal/privacy-policy" className="hover:text-blue-600 transition">Privacy Policy</Link>
        <span className="hidden sm:inline">•</span>
        <Link href="/legal/terms-of-service" className="hover:text-blue-600 transition">Terms of Service</Link>
      </footer>
    </div>
  );
}
