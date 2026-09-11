"use client";

import { Activity, ArrowDownCircle, ArrowUpCircle, Users, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { LoanDashboard } from "@/lib/api";
import { contactInitials } from "@/lib/contactDisplay";
import { formatCurrency } from "@/lib/currency";

interface LoanDashboardPageClientProps {
  dashboard: LoanDashboard;
  currency: string;
}

type SortOrder = "high-low" | "low-high";

export function LoanDashboardPageClient({ dashboard, currency }: LoanDashboardPageClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("high-low");

  const rows = useMemo(() => {
    const filtered = dashboard.rows.filter((r) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return r.contactName.toLowerCase().includes(q) || (r.contactPhone ?? "").includes(q);
    });
    return filtered.slice().sort((a, b) => {
      const diff = Math.abs(Number(b.currentBalance)) - Math.abs(Number(a.currentBalance));
      return sort === "high-low" ? diff : -diff;
    });
  }, [dashboard.rows, search, sort]);

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">Loan Management Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-500">Manage loans, track outstanding and transactions.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard icon={ArrowUpCircle} label="Total Dena" value={formatCurrency(dashboard.totalDena, currency)} sub="Negative balances" color="text-brand-danger" />
        <SummaryCard icon={ArrowDownCircle} label="Total Pawna" value={formatCurrency(dashboard.totalPawna, currency)} sub="Positive balances" color="text-brand-primary" />
        <SummaryCard icon={Wallet} label="Total Paid" value={formatCurrency(dashboard.totalPaid, currency)} sub="Payment made" color="text-neutral-900" />
        <SummaryCard icon={Wallet} label="Total Received" value={formatCurrency(dashboard.totalReceived, currency)} sub="Cash received" color="text-neutral-900" />
        <SummaryCard
          icon={Activity}
          label="Net Balance"
          value={formatCurrency(Math.abs(Number(dashboard.netBalance)), currency)}
          sub={Number(dashboard.netBalance) >= 0 ? "Pawna (+)" : "Dena (-)"}
          color={Number(dashboard.netBalance) >= 0 ? "text-brand-primary" : "text-brand-danger"}
        />
        <SummaryCard icon={Users} label="Active Accounts" value={String(dashboard.activeAccounts)} sub="Total Active" color="text-neutral-900" />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-900">Loan / Outstanding by Bank / Person</h2>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-56 rounded-xl border border-neutral-200 bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOrder)}
              className="rounded-xl border border-neutral-200 bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand-primary"
            >
              <option value="high-low">Balance (high-low)</option>
              <option value="low-high">Balance (low-high)</option>
            </select>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">Nothing outstanding right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Bank / Person</th>
                  <th className="px-4 py-3 font-medium text-right">Opening Balance</th>
                  <th className="px-4 py-3 font-medium text-right">Receive</th>
                  <th className="px-4 py-3 font-medium text-right">Payment</th>
                  <th className="px-4 py-3 font-medium text-right">Current Dena/Pawna</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {rows.map((row, index) => (
                  <tr
                    key={row.contactId}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/contacts/${row.contactId}`)}
                    className="cursor-pointer hover:bg-neutral-50/60"
                  >
                    <td className="px-4 py-3 text-neutral-400">{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                          {contactInitials(row.contactName)}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-800">{row.contactName}</p>
                          {row.contactPhone && <p className="text-xs text-neutral-400">{row.contactPhone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-500">
                      {Number(row.openingBalance) === 0 ? <span className="text-neutral-300">Tk 0 (Balanced)</span> : formatCurrency(row.openingBalance, currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-brand-primary">{formatCurrency(row.totalReceive, currency)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-brand-danger">{formatCurrency(row.totalPayment, currency)}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${row.direction === "PAWNA" ? "text-brand-primary" : row.direction === "DENA" ? "text-brand-danger" : "text-neutral-400"}`}>
                      {formatCurrency(Math.abs(Number(row.currentBalance)), currency)}
                      {row.direction !== "SETTLED" && <span className="ml-1 text-xs font-normal">({row.direction === "PAWNA" ? "Pawna" : "Dena"})</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-200 text-sm font-bold text-neutral-900">
                  <td className="px-4 py-3" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(
                      rows.reduce((s, r) => s + Number(r.openingBalance), 0),
                      currency,
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-primary">{formatCurrency(dashboard.totalReceived, currency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-danger">{formatCurrency(dashboard.totalPaid, currency)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums ${Number(dashboard.netBalance) >= 0 ? "text-brand-primary" : "text-brand-danger"}`}>
                    {formatCurrency(Math.abs(Number(dashboard.netBalance)), currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-primary" /> Pawna (You Receive)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-danger" /> Dena (You Pay)
        </span>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-sm shadow-black/5">
      <div className="flex items-center gap-2 text-neutral-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-2 text-xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-neutral-400">{sub}</p>
    </div>
  );
}
