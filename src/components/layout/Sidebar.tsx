"use client";

import { ArrowLeftRight, Banknote, ChevronDown, ChevronRight, FileText, HandCoins, Landmark, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Only pages that actually exist get a nav item -- Dashboard (Prompt 2),
// Transactions (Prompt 5, bare-bones raw journal entry UI -- Prompt 6
// replaces it with friendly Income/Expense/Transfer screens but keeps this
// nav slot), Contacts (Prompt 8), Dena-Pawna (Prompt 9 -- the Receivable/
// Payable feature built directly on Contacts). Future prompts add more as
// their pages land, same convention as admin-frontend's own Sidebar.tsx.
// "Accounts" moved into the Balance group below (as "Wallet") to match the
// reference layout the user asked for -- it's the same /accounts page,
// just reachable from a different nav spot now.
const TOP_NAV_ITEMS = [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }];

const REST_NAV_ITEMS = [
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Dena-Pawna", href: "/dena-pawna", icon: HandCoins },
];

// Overview/Balance Transfer/Wallet are dedicated pages built specifically
// for this group; Account Ledger just links to the existing General
// Ledger page (Prompt 7). Wallet manages money accounts (cash/bank/mfs)
// with a simplified name/account-number/opening-balance form -- distinct
// from the full Chart of Accounts at /accounts (still reachable, just not
// linked directly from this sidebar; see WalletPageClient's row links).
const BALANCE_ITEMS = [
  { label: "Overview", href: "/balance/overview" },
  { label: "Balance Transfer", href: "/balance/transfer" },
  { label: "Account Ledger", href: "/reports/general-ledger" },
  { label: "Wallet", href: "/balance/wallet" },
];

// Dashboard/Transactions/Ledger/Bank-Person-List are dedicated pages
// sharing the exact same Contact + Receivable/Payable engine as Dena-Pawna,
// scoped to category: LOAN contacts (banks/persons you lend to or borrow
// from) instead of BUSINESS ones (customers/suppliers) -- see
// ReceivablesPayablesService.getLoanDashboard()'s comment. Ledger is a
// dedicated "Loan Statement" (one contact, one date range, running balance
// carried forward) -- see getLoanStatement() -- unlike Balance's own
// Account Ledger item, which just reuses the General Ledger page.
const LOAN_MANAGEMENT_ITEMS = [
  { label: "Dashboard", href: "/loan-management/dashboard" },
  { label: "Transactions", href: "/loan-management/transactions" },
  { label: "Ledger", href: "/loan-management/ledger" },
  { label: "Bank / Person List", href: "/loan-management/bank-person-list" },
];

// Was a disabled placeholder since Prompt 1 -- General Ledger and Trial
// Balance are its first two real sub-items (Prompt 7); Aging Receivable/
// Payable (Prompt 9) followed. More report types (P&L, Balance Sheet, Cash
// Flow) land in Prompts 12-13.
const REPORTS_ITEMS = [
  { label: "General Ledger", href: "/reports/general-ledger" },
  { label: "Trial Balance", href: "/reports/trial-balance" },
  { label: "Aging Receivable", href: "/reports/aging-receivable" },
  { label: "Aging Payable", href: "/reports/aging-payable" },
];

interface NavGroupProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  items: { label: string; href: string }[];
  isActive: boolean;
}

// Shared collapsible-group rendering for Balance and Reports -- both
// expand/collapse the same way, defaulting open only when the current
// route already falls under that group.
function NavGroup({ icon: Icon, label, items, isActive }: NavGroupProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(isActive);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-3 rounded-lg border-l-4 px-4 py-2.5 text-sm transition-colors ${
          isActive ? "border-brand-primary bg-brand-dark-hover font-medium text-white" : "border-transparent text-white/70 hover:bg-brand-dark-hover hover:text-white"
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
        {open ? <ChevronDown className="ml-auto h-3.5 w-3.5" /> : <ChevronRight className="ml-auto h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="space-y-0.5 py-0.5 pl-8">
          {items.map((item) => {
            const itemActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                  itemActive ? "bg-brand-dark-hover font-medium text-white" : "text-white/60 hover:bg-brand-dark-hover hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function NavLink({ item, isActive }: { item: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
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
}

export function Sidebar() {
  const pathname = usePathname();
  const isBalanceActive = pathname.startsWith("/balance") || pathname.startsWith("/accounts");
  const isLoanManagementActive = pathname.startsWith("/loan-management");
  const isReportsActive = pathname.startsWith("/reports");

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-brand-dark text-white">
      <div className="flex h-16 items-center px-6 text-lg font-semibold tracking-wide">Money Tracker</div>
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {TOP_NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname.startsWith(item.href)} />
        ))}

        <NavGroup icon={Landmark} label="Balance" items={BALANCE_ITEMS} isActive={isBalanceActive} />
        <NavGroup icon={Banknote} label="Loan Management" items={LOAN_MANAGEMENT_ITEMS} isActive={isLoanManagementActive} />

        {REST_NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname.startsWith(item.href)} />
        ))}

        <NavGroup icon={FileText} label="Reports" items={REPORTS_ITEMS} isActive={isReportsActive} />
      </nav>
    </aside>
  );
}
