"use client";

import { ArrowLeftRight, BookOpen, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function Sidebar() {
  const pathname = usePathname();

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
      </nav>
    </aside>
  );
}
