"use client";

import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, Circle, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Account, Transaction, TransactionType } from "@/lib/api";

interface TransactionsPageClientProps {
  transactions: Transaction[];
  accounts: Account[];
}

const TYPE_OPTIONS: { value: TransactionType | ""; label: string }[] = [
  { value: "", label: "All types" },
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expense" },
  { value: "TRANSFER", label: "Transfer" },
];

function amountFor(transaction: Transaction): number {
  return Number(transaction.entries[0]?.amount ?? 0);
}

function categoryFor(transaction: Transaction): string | null {
  return transaction.entries.find((e) => e.categoryId)?.categoryId ?? null;
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

export function TransactionsPageClient({ transactions, accounts }: TransactionsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/transactions?${next.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("search", searchInput);
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8 pb-24 md:pb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Activity</h1>
          <p className="mt-1 text-sm text-neutral-500">Everything you&apos;ve added, newest first.</p>
        </div>
        <Link href="/transactions/advanced" className="text-sm font-medium text-neutral-400 hover:text-neutral-600 hover:underline">
          Advanced: Raw Journal Entry →
        </Link>
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

      <div className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {transactions.length === 0 && <p className="px-4 py-10 text-center text-sm text-neutral-400">Nothing here yet -- tap &quot;Add&quot; to get started.</p>}
        <div className="divide-y divide-neutral-50">
          {transactions.map((t) => {
            const { Icon, color, sign } = typeVisual(t.transactionType);
            const category = categoryFor(t);
            const isVoided = t.status === "VOIDED";
            return (
              <Link
                key={t.id}
                href={`/transactions/${t.id}`}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/60 ${isVoided ? "opacity-50" : ""}`}
              >
                <Icon className={`h-8 w-8 shrink-0 ${color}`} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium text-neutral-800 ${isVoided ? "line-through" : ""}`}>
                    {t.description ?? t.transactionType}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {new Date(t.transactionDate).toLocaleDateString()}
                    {category && <span> · {category}</span>}
                    {isVoided && <span className="text-brand-danger"> · Voided</span>}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-semibold tabular-nums ${isVoided ? "text-neutral-400" : color}`}>
                  {sign}
                  {amountFor(t).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
