"use client";

import {
  ArrowLeftRight,
  Banknote,
  Boxes,
  ChevronDown,
  ChevronRight,
  FileText,
  Gift,
  KeyRound,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

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

// Sits between Balance and Savings Goals (matching where the user first
// pointed it out). Five sub-pages per the user's explicit spec, each with
// ONE distinct job so there's no overlap between them: Dashboard is a pure
// overview (total value + every asset, active and sold, no category
// filter -- that moved to its own Category page below); Current Asset
// list is a plain read-only table of what's owned right now; Purchase &
// Sell Asset is the only place to buy a new one or sell an owned one;
// Asset update is the only place to revalue one (appreciation/
// depreciation); Category is the only place to filter/browse assets by
// category. Same Dashboard/[...]/submenu shape as Balance/Savings Goals
// above.
const ASSETS_MANAGEMENT_ITEMS = [
  { label: "Dashboard", href: "/assets-management/dashboard" },
  { label: "Current Asset list", href: "/assets-management/current" },
  { label: "Purchase & Sell Asset", href: "/assets-management/purchase-sell" },
  { label: "Asset update", href: "/assets-management/update" },
  { label: "Category", href: "/assets-management/category" },
];

// Reached from the TopBar avatar dropdown's "Profile"/"Settings" links
// (/settings) -- placed last, below every feature group, matching where the
// user asked for it. Also covers /settings/workspaces (already reachable
// via the TopBar's own gear icon) since that's a sub-page of this same
// Settings area. "Password Manager" is a standalone credential vault
// (client's own Facebook/bank/etc. logins, unrelated to this app's own
// accounting data) -- sits just above Settings, its own top-level item
// rather than a group, since it's a single page, not a Dashboard/Wallet/
// Transfer-style submenu. "Referrals" is the same kind of personal/
// account-level feature (invite friends, earn reward credit tied to the
// USER, not any one workspace) rather than a workspace-accounting one --
// same reasoning as Password Manager's own comment -- so it sits just
// above it, its own top-level item too.
// "Group Expense" (মেস/যৌথ হিসাব) is deliberately its own top-level item,
// NOT wired into the Balance/Loan Management-style active-workspace groups
// above -- it isn't scoped to whichever Personal/Business workspace is
// currently active at all (see lib/activeBusiness.ts's comment on why
// multi-workspace switching was removed). Each Group workspace lives at its
// own /group-expenses/[businessId] URL instead, so this link always just
// goes to the list of the user's Group workspaces, same "not tied to the
// active workspace" reasoning as Referrals/Password Manager below.
const BOTTOM_NAV_ITEMS = [
  { label: "Group Expense", href: "/group-expenses", icon: Users },
  { label: "Referrals", href: "/referrals", icon: Gift },
  { label: "Password Manager", href: "/password-manager", icon: KeyRound },
  { label: "Settings", href: "/settings", icon: Settings },
];

// The standalone "Dena-Pawna" nav item was removed at the user's request --
// Loan Management's own Dashboard/Transactions/Ledger already cover the
// same Receivable/Payable engine over the same (now unfiltered) contact
// list, so a second top-level entry point was redundant. /dena-pawna itself
// is left in place (just unlinked), same treatment as the old Bank/Person
// List page below.

// Overview/Balance Transfer/Wallet/Ledger are all dedicated pages built
// specifically for this group. Ledger (/balance/ledger) is a standalone
// single-account statement -- pick ANY account (not just money accounts)
// from a searchable combobox and a period, see Opening/Total In/Total Out/
// Closing Balance plus a running-balance table -- distinct from the
// account-picked-by-clicking-a-row flow at /accounts/[id] and from the
// grouped-list-of-every-account view at /reports/general-ledger (still
// reachable from the Reports group). Wallet manages money accounts (cash/
// bank/mfs) with a simplified name/account-number/opening-balance form --
// distinct from the full Chart of Accounts at /accounts (still reachable,
// just not linked directly from this sidebar; see WalletPageClient's row
// links).
const BALANCE_ITEMS = [
  { label: "Overview", href: "/balance/overview" },
  { label: "Balance Transfer", href: "/balance/transfer" },
  { label: "Ledger", href: "/balance/ledger" },
  { label: "Wallet", href: "/balance/wallet" },
];

// A named target funded by real contributions from a money account, all
// pooled into one system "Savings" Account -- see
// backend/src/savings-goals/savings-goals.service.ts's header comment.
// Same Dashboard/Wallet/Transfer submenu shape as the Balance group above.
const SAVINGS_GOALS_ITEMS = [
  { label: "Dashboard", href: "/savings-goals/dashboard" },
  { label: "Overview", href: "/savings-goals/overview" },
  { label: "Wallet", href: "/savings-goals/wallet" },
  { label: "Transfer", href: "/savings-goals/transfer" },
];

// Dashboard/Transactions/Ledger are dedicated pages sharing the exact same
// Contact + Receivable/Payable engine as Dena-Pawna, scoped to category:
// LOAN contacts (banks/persons you lend to or borrow from) instead of
// BUSINESS ones (customers/suppliers) -- see
// ReceivablesPayablesService.getLoanDashboard()'s comment. Ledger is a
// dedicated "Loan Statement" (one contact, one date range, running balance
// carried forward) -- see getLoanStatement() -- unlike Balance's own
// Account Ledger item, which just reuses the General Ledger page.
//
// "Contacts" (not "Bank / Person List" anymore) sits last in this group --
// per the user's explicit request. The general Contacts page already lists
// every contact regardless of category (it doesn't filter by category at
// all, unlike the old Bank/Person List page's category: "LOAN" filter), so
// nothing is lost by pointing here instead. Note: creating a NEW loan
// contact (category: "LOAN") still only has one real UI path --
// BankPersonFormModal, at /loan-management/bank-person-list -- the general
// Contacts page's own form has no category field and always creates
// BUSINESS ones. That page/route/component were deliberately left in place
// (just unlinked from the sidebar) rather than deleted, since removing them
// would remove the only way to add a bank/person loan contact.
const LOAN_MANAGEMENT_ITEMS = [
  { label: "Dashboard", href: "/loan-management/dashboard" },
  { label: "Transactions", href: "/loan-management/transactions" },
  { label: "Ledger", href: "/loan-management/ledger" },
  { label: "Contacts", href: "/contacts" },
];

// Groups the transaction ledger with the merged category page and the one
// overall income goal -- per the user's explicit placement request, in this
// order. "Income Category" and "Expense Category" used to be two separate
// pages (/income-planning, /budget-planning); they're now one two-column
// page at /categories (CategoriesPageClient, labeled "Budget Planning" in
// the UI per the user's rename request), since the two page.tsx files they
// used to route to were identical except for which BudgetCategoryType they
// fetched. They're still NOT symmetric within that merged page: every
// Expense category carries its own spending limit, but Income categories
// have no per-category goal at all -- that's the single "Monthly income
// goal" item instead (its own page, /income-goal). The old routes redirect
// to /categories rather than being removed outright, so old bookmarks/
// back-button history don't 404.
const INCOME_EXPENSE_ITEMS = [
  { label: "Transaction", href: "/transactions" },
  { label: "Budget Planning", href: "/categories" },
];

// Was a disabled placeholder since Prompt 1 -- General Ledger and Trial
// Balance are its first two real sub-items (Prompt 7); Aging Receivable/
// Payable (Prompt 9) followed. More report types (P&L, Balance Sheet, Cash
// Flow) land in Prompts 12-13. "Overview" (Income/Expense by Category
// donuts + Income vs Savings trend) sits first, per the user's explicit
// request -- defaults to "This Month" (see its page.tsx), unlike every
// other list page in this app.
const REPORTS_ITEMS = [
  { label: "Overview", href: "/reports/overview" },
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

// Shared collapsible-group rendering for Balance, Loan Management, Income &
// Expense, and Reports -- all expand/collapse the same way, defaulting open
// only when the current route already falls under that group.
function NavGroup({ icon: Icon, label, items, isActive }: NavGroupProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(isActive);
  const { t } = useLocale();

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
        {t(label)}
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
                {t(item.label)}
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
  const { t } = useLocale();
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
      {t(item.label)}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isBalanceActive = pathname.startsWith("/balance") || pathname.startsWith("/accounts");
  const isAssetsManagementActive = pathname.startsWith("/assets-management");
  const isSavingsGoalsActive = pathname.startsWith("/savings-goals");
  const isLoanManagementActive = pathname.startsWith("/loan-management") || pathname.startsWith("/contacts");
  const isIncomeExpenseActive =
    pathname.startsWith("/transactions") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/income-planning") ||
    pathname.startsWith("/budget-planning");
  const isReportsActive = pathname.startsWith("/reports");

  return (
    <aside className="flex w-64 shrink-0 flex-col overflow-hidden bg-brand-dark text-white">
      <div className="flex h-16 shrink-0 items-center px-6 text-lg font-semibold tracking-wide">Money Tracker</div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {TOP_NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname.startsWith(item.href)} />
        ))}

        <NavGroup icon={Landmark} label="Balance" items={BALANCE_ITEMS} isActive={isBalanceActive} />
        <NavGroup icon={ArrowLeftRight} label="Income & Expense" items={INCOME_EXPENSE_ITEMS} isActive={isIncomeExpenseActive} />
        <NavGroup icon={Boxes} label="Assets Management" items={ASSETS_MANAGEMENT_ITEMS} isActive={isAssetsManagementActive} />
        <NavGroup icon={PiggyBank} label="Savings Goals" items={SAVINGS_GOALS_ITEMS} isActive={isSavingsGoalsActive} />
        <NavGroup icon={Banknote} label="Loan Management" items={LOAN_MANAGEMENT_ITEMS} isActive={isLoanManagementActive} />
        <NavGroup icon={FileText} label="Reports" items={REPORTS_ITEMS} isActive={isReportsActive} />

        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} isActive={pathname.startsWith(item.href)} />
        ))}
      </nav>
    </aside>
  );
}
