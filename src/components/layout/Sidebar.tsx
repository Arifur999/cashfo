"use client";

import { ArrowLeftRight, BookOpen, ChevronDown, ChevronRight, FileText, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Only pages that actually exist get a nav item -- Dashboard (Prompt 2),
// Accounts (Prompt 4), Transactions (Prompt 5, bare-bones raw journal entry
// UI -- Prompt 6 replaces it with friendly Income/Expense/Transfer screens
// but keeps this nav slot). Future prompts add more as their pages land,
// same convention as admin-frontend's own Sidebar.tsx.
const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Accounts", href: "/accounts", icon: BookOpen },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
];

// Was a disabled placeholder since Prompt 1 -- General Ledger and Trial
// Balance are its first two real sub-items (Prompt 7). More report types
// (P&L, Balance Sheet, Cash Flow) land in Prompts 12-13.
const REPORTS_ITEMS = [
  { label: "General Ledger", href: "/reports/general-ledger" },
  { label: "Trial Balance", href: "/reports/trial-balance" },
];

export function Sidebar() {
  const pathname = usePathname();
  const isReportsActive = pathname.startsWith("/reports");
  const [reportsOpen, setReportsOpen] = useState(isReportsActive);

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-brand-dark text-white">
      <div className="flex h-16 items-center px-6 text-lg font-semibold tracking-wide">Money Tracker</div>
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg border-l-4 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? "border-brand-primary bg-brand-dark-hover font-medium text-white"
                  : "border-transparent text-white/70 hover:bg-brand-dark-hover hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setReportsOpen((v) => !v)}
          className={`flex w-full items-center gap-3 rounded-lg border-l-4 px-4 py-2.5 text-sm transition-colors ${
            isReportsActive ? "border-brand-primary bg-brand-dark-hover font-medium text-white" : "border-transparent text-white/70 hover:bg-brand-dark-hover hover:text-white"
          }`}
        >
          <FileText className="h-4 w-4" />
          Reports
          {reportsOpen ? <ChevronDown className="ml-auto h-3.5 w-3.5" /> : <ChevronRight className="ml-auto h-3.5 w-3.5" />}
        </button>
        {reportsOpen && (
          <div className="space-y-0.5 py-0.5 pl-8">
            {REPORTS_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive ? "bg-brand-dark-hover font-medium text-white" : "text-white/60 hover:bg-brand-dark-hover hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>
    </aside>
  );
}
