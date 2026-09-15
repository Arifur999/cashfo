"use client";

import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, ChevronLeft, ChevronRight, Circle, Plus, Search, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AddTransactionModal } from "@/components/quick-entry/AddTransactionModal";
import { budgetCategoryColorClass, budgetCategoryIcon } from "@/lib/budgetCategoryVisuals";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { Account, Transaction, TransactionEntry, TransactionType } from "@/lib/api";

interface TransactionsPageClientProps {
  businessId: string;
  transactions: Transaction[];
  accounts: Account[];
  // Every Expense/Income Category the business has (icon/color included) --
  // used to resolve the Icon column to the SAME badge each category shows
  // on its own Expense Category / Income Category page, rather than a
  // fixed guess-by-name map that doesn't know about a user's own custom
  // categories.
  categories: { id: string; name: string; icon: string | null; color: string }[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  currency: string;
}

// No "Transfer" option -- this page is scoped to Income & Expense only
// (Balance Transfer/Savings Transfer have their own dedicated list pages),
// see transactions/page.tsx's transactionTypes default.
const TYPE_OPTIONS: { value: TransactionType | ""; label: string }[] = [
  { value: "", label: "All types" },
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expense" },
];

function amountFor(transaction: Transaction): number {
  return Number(transaction.entries[0]?.amount ?? 0);
}

function categoryEntryFor(transaction: Transaction): TransactionEntry | null {
  return transaction.entries.find((e) => e.categoryId) ?? null;
}

// The category entry (if any) is the non-money side of an income/expense
// posting -- see quick-entries.service.ts's createIncome/createExpense,
// where entry order differs between the two, so "the other entry" is found
// by exclusion rather than assumed to be entries[0]/[1]. A TRANSFER has
// neither entry categorized (both are money accounts), so it's rendered as
// "from -> to" instead of one account name.
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

function noteFor(transaction: Transaction): string | null {
  return transaction.entries.find((e) => e.note)?.note ?? null;
}

function typeVisual(type: TransactionType) {
  switch (type) {
    case "INCOME":
      return { Icon: ArrowUpCircle, color: "text-brand-primary", sign: "+" as const };
    case "EXPENSE":
      return { Icon: ArrowDownCircle, color: "text-brand-danger", sign: "-" as const };
    case "TRANSFER":
      return { Icon: ArrowLeftRight, color: "text-neutral-500", sign: "" as const };
    default:
      return { Icon: Circle, color: "text-neutral-400", sign: "" as const };
  }
}

// Compact page-number list with ellipses for large result sets -- always
// shows first, last, current, and current's immediate neighbors.
function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "...")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) result.push("...");
    result.push(p);
  });
  return result;
}

export function TransactionsPageClient({ businessId, transactions, accounts, categories, meta, currency }: TransactionsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [addOpen, setAddOpen] = useState(false);

  const categoryByName = new Map(categories.map((c) => [c.name, c]));

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    router.push(`/transactions?${next.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("search", searchInput);
  }

  const rangeStart = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const rangeEnd = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="h-full bg-brand-content px-6 py-8 pb-24 md:pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Transactions</h1>
          <p className="mt-1 text-sm text-neutral-500">Every income, expense and transfer you&apos;ve added, newest first.</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> Add Transaction
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search description..."
            className="w-56 rounded-xl border border-neutral-200 bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-primary"
          />
        </form>
        <select
          value={searchParams.get("type") ?? ""}
          onChange={(e) => updateParam("type", e.target.value)}
          className="rounded-xl border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={searchParams.get("accountId") ?? ""}
          onChange={(e) => updateParam("accountId", e.target.value)}
          className="rounded-xl border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={searchParams.get("dateFrom") ?? ""}
          onChange={(e) => updateParam("dateFrom", e.target.value)}
          title="From date"
          className="rounded-xl border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-primary"
        />
        <input
          type="date"
          value={searchParams.get("dateTo") ?? ""}
          onChange={(e) => updateParam("dateTo", e.target.value)}
          title="To date"
          className="rounded-xl border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-primary"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-surface shadow-sm shadow-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Icon</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Note</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {transactions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-400">
                  Nothing here yet -- tap &quot;Add&quot; to get started.
                </td>
              </tr>
            )}
            {transactions.map((t, index) => {
              const { color, sign } = typeVisual(t.transactionType);
              const category = categoryEntryFor(t)?.categoryId ?? null;
              // The category's own real icon/color (same lookup the Expense
              // Category / Income Category pages use) -- falls back to a
              // neutral wallet badge when there's no matching category (e.g.
              // a Transfer, or a category that's since been deleted).
              const categoryMeta = category ? categoryByName.get(category) : undefined;
              // No category match at all (e.g. a Transfer) falls back to a
              // neutral wallet glyph; a real category with no icon chosen
              // shows just its colored circle, no icon inside.
              const CategoryIcon = categoryMeta ? (categoryMeta.icon ? budgetCategoryIcon(categoryMeta.icon) : null) : Wallet;
              const isVoided = t.status === "VOIDED";
              const note = noteFor(t);
              return (
                <tr
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/transactions/${t.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && router.push(`/transactions/${t.id}`)}
                  className={`cursor-pointer hover:bg-neutral-50/60 ${isVoided ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3 text-neutral-400">{rangeStart + index}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          categoryMeta ? budgetCategoryColorClass(categoryMeta.color) : "bg-neutral-300"
                        }`}
                      >
                        {CategoryIcon && <CategoryIcon className="h-3.5 w-3.5 text-white" />}
                      </div>
                      {isVoided && <span className="text-xs font-normal text-brand-danger">Voided</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{formatDate(t.transactionDate)}</td>
                  <td className="px-4 py-3 text-neutral-600">{category ?? <span className="text-neutral-400">—</span>}</td>
                  <td className={`px-4 py-3 text-neutral-600 ${isVoided ? "line-through" : ""}`}>{accountLabelFor(t)}</td>
                  <td className="max-w-[12rem] truncate px-4 py-3 text-neutral-400">{note ?? "—"}</td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${isVoided ? "text-neutral-400" : color}`}>
                    {sign}
                    {formatCurrency(amountFor(t), currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {meta.total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">
            Showing {rangeStart}-{rangeEnd} of {meta.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={meta.page <= 1}
              onClick={() => updateParam("page", String(meta.page - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageNumbers(meta.page, meta.totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1.5 text-sm text-neutral-400">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => updateParam("page", String(p))}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
                    p === meta.page ? "bg-brand-primary text-white" : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={meta.page >= meta.totalPages}
              onClick={() => updateParam("page", String(meta.page + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <AddTransactionModal open={addOpen} onClose={() => setAddOpen(false)} businessId={businessId} currency={currency} />
    </div>
  );
}
