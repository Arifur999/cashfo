"use client";

import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpCircle,
  Banknote,
  Boxes,
  HandCoins,
  KeyRound,
  Landmark,
  LayoutGrid,
  Package,
  PiggyBank,
  Plus,
  Receipt,
  ScrollText,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AddTransactionModal } from "@/components/quick-entry/AddTransactionModal";
import { IncomeVsSavingsChart } from "@/components/reports/IncomeVsSavingsChart";
import type { IncomeVsSavingsPoint, LoanDashboard, Transaction, TransactionEntry } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface DashboardPageClientProps {
  businessId: string;
  businessName: string;
  userName: string;
  currency: string;
  totalBalance: string;
  monthIncome: string;
  monthExpense: string;
  totalSaved: string;
  savingsTarget: string;
  savingsProgressPercent: number;
  totalAssets: string;
  loanDashboard: LoanDashboard;
  recentTransactions: Transaction[];
  trendPoints: IncomeVsSavingsPoint[];
}

function amountFor(transaction: Transaction): number {
  return Number(transaction.entries[0]?.amount ?? 0);
}

function categoryEntryFor(transaction: Transaction): TransactionEntry | null {
  return transaction.entries.find((e) => e.categoryId) ?? null;
}

// Same "the other entry" exclusion logic as TransactionsPageClient.tsx --
// entry order differs between createIncome/createExpense, so the money-side
// account can't be assumed to be entries[0]/[1].
function accountLabelFor(transaction: Transaction): string {
  const categoryEntry = categoryEntryFor(transaction);
  if (categoryEntry) {
    const moneyEntry = transaction.entries.find((e) => e.id !== categoryEntry.id);
    return moneyEntry?.account?.name ?? "—";
  }
  if (transaction.transactionType === "TRANSFER" && transaction.entries.length === 2) {
    const from = transaction.entries.find((e) => e.entryType === "CREDIT");
    const to = transaction.entries.find((e) => e.entryType === "DEBIT");
    if (from?.account && to?.account) return `${from.account.name} → ${to.account.name}`;
  }
  return transaction.entries[0]?.account?.name ?? "—";
}

function typeVisual(type: Transaction["transactionType"]) {
  switch (type) {
    case "INCOME":
      return { Icon: ArrowUpCircle, color: "text-brand-primary", sign: "+" as const };
    case "EXPENSE":
      return { Icon: ArrowDownCircle, color: "text-brand-danger", sign: "-" as const };
    case "TRANSFER":
      return { Icon: ArrowLeftRight, color: "text-neutral-500", sign: "" as const };
    default:
      return { Icon: Receipt, color: "text-neutral-400", sign: "" as const };
  }
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color?: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
      <div className="flex items-center gap-2 text-neutral-400">
        <Icon className="h-4 w-4" />
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className={`mt-2 text-xl font-bold tabular-nums ${color ?? "text-neutral-900"}`}>{value}</p>
    </div>
  );
}

const EXPLORE_LINKS = [
  { label: "Balance", href: "/balance/overview", icon: Wallet },
  { label: "Assets Management", href: "/assets-management/dashboard", icon: Boxes },
  { label: "Savings Goals", href: "/savings-goals/dashboard", icon: PiggyBank },
  { label: "Loan Management", href: "/loan-management/dashboard", icon: HandCoins },
  { label: "Income & Expense", href: "/transactions", icon: ArrowLeftRight },
  { label: "Reports", href: "/reports/overview", icon: ScrollText },
  { label: "Contacts", href: "/contacts", icon: Users },
  { label: "Password Manager", href: "/password-manager", icon: KeyRound },
];

export function DashboardPageClient({
  businessId,
  businessName,
  userName,
  currency,
  totalBalance,
  monthIncome,
  monthExpense,
  totalSaved,
  savingsTarget,
  savingsProgressPercent,
  totalAssets,
  loanDashboard,
  recentTransactions,
  trendPoints,
}: DashboardPageClientProps) {
  const { t } = useLocale();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const netThisMonth = Number(monthIncome) - Number(monthExpense);
  const netBalance = Number(loanDashboard.netBalance);

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">
            {t("Dashboard")} — {businessName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {t("Welcome back,")} {userName}. {t("Here's what's happening with your money.")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-primary-hover"
          >
            <Plus className="h-4 w-4" /> {t("Add Transaction")}
          </button>
          <Link
            href="/balance/transfer"
            className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-surface px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <ArrowLeftRight className="h-4 w-4" /> {t("Transfer")}
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Wallet} label={t("Total Balance")} value={formatCurrency(totalBalance, currency)} color="text-brand-primary" />
        <StatCard icon={ArrowUpCircle} label={t("This Month Income")} value={formatCurrency(monthIncome, currency)} color="text-brand-primary" />
        <StatCard icon={ArrowDownCircle} label={t("This Month Expense")} value={formatCurrency(monthExpense, currency)} color="text-brand-danger" />
        <StatCard
          icon={Banknote}
          label={t("Net This Month")}
          value={`${netThisMonth < 0 ? "-" : ""}${formatCurrency(Math.abs(netThisMonth), currency)}`}
          color={netThisMonth >= 0 ? "text-brand-primary" : "text-brand-danger"}
        />
        <StatCard icon={PiggyBank} label={t("Total Savings")} value={formatCurrency(totalSaved, currency)} />
        <StatCard icon={Package} label={t("Total Assets")} value={formatCurrency(totalAssets, currency)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IncomeVsSavingsChart points={trendPoints} currency={currency} />

        <div className="rounded-2xl bg-surface shadow-sm shadow-black/5">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-neutral-900">{t("Recent Transactions")}</h2>
            <Link href="/transactions" className="flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline">
              {t("View All")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-400">{t("No transactions yet.")}</p>
          ) : (
            <ul className="divide-y divide-neutral-50">
              {recentTransactions.map((tx) => {
                const { Icon, color, sign } = typeVisual(tx.transactionType);
                return (
                  <li key={tx.id}>
                    <Link href={`/transactions/${tx.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50/60">
                      <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-800">
                          {tx.description || accountLabelFor(tx)}
                        </p>
                        <p className="text-xs text-neutral-400">{formatDate(tx.transactionDate)}</p>
                      </div>
                      <p className={`shrink-0 text-sm font-semibold tabular-nums ${color}`}>
                        {sign}
                        {formatCurrency(amountFor(tx), currency)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">{t("Savings Goals")}</h2>
            <Link href="/savings-goals/dashboard" className="flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline">
              {t("View All")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-neutral-500">{t("Saved")}</span>
            <span className="font-semibold tabular-nums text-neutral-900">{formatCurrency(totalSaved, currency)}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between text-sm">
            <span className="text-neutral-500">{t("Target")}</span>
            <span className="font-semibold tabular-nums text-neutral-900">{formatCurrency(savingsTarget, currency)}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-brand-primary" style={{ width: `${Math.min(100, savingsProgressPercent)}%` }} />
          </div>
          <p className="mt-1.5 text-right text-xs text-neutral-400">{savingsProgressPercent}%</p>
        </div>

        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">{t("Loan Management")}</h2>
            <Link href="/loan-management/dashboard" className="flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline">
              {t("View All")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Landmark className={`h-5 w-5 ${netBalance >= 0 ? "text-brand-primary" : "text-brand-danger"}`} />
            <p className={`text-xl font-bold tabular-nums ${netBalance >= 0 ? "text-brand-primary" : "text-brand-danger"}`}>
              {formatCurrency(Math.abs(netBalance), currency)}
            </p>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            {netBalance > 0 ? t("Pawna (You Receive)") : netBalance < 0 ? t("Dena (You Pay)") : t("Settled")}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <LayoutGrid className="h-4 w-4" /> {t("Explore")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {EXPLORE_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-4 text-center shadow-sm shadow-black/5 transition-colors hover:bg-neutral-50"
            >
              <link.icon className="h-6 w-6 text-brand-primary" />
              <span className="text-xs font-medium text-neutral-700">{t(link.label)}</span>
            </Link>
          ))}
        </div>
      </div>

      <AddTransactionModal open={isAddOpen} onClose={() => setIsAddOpen(false)} businessId={businessId} currency={currency} />
    </div>
  );
}
