"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AgingReport } from "@/lib/api";
import { contactInitials } from "@/lib/contactDisplay";
import { formatCurrency } from "@/lib/currency";
import { RecordPaymentModal } from "@/components/receivables-payables/RecordPaymentModal";

interface DenaPawnaPageClientProps {
  businessId: string;
  receivableAging: AgingReport;
  payableAging: AgingReport;
  receivableOverdueCount: number;
  payableOverdueCount: number;
  canManage: boolean;
  currency: string;
}

type Tab = "RECEIVABLE" | "PAYABLE";

function overdueAmount(row: { days1to30: string; days31to60: string; over60: string }): number {
  return Number(row.days1to30) + Number(row.days31to60) + Number(row.over60);
}

export function DenaPawnaPageClient({
  businessId,
  receivableAging,
  payableAging,
  receivableOverdueCount,
  payableOverdueCount,
  canManage,
  currency,
}: DenaPawnaPageClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("RECEIVABLE");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<string | null>(null);

  const activeAging = tab === "RECEIVABLE" ? receivableAging : payableAging;
  const totalReceivable = Object.values(receivableAging.buckets).reduce((sum, v) => sum + Number(v), 0);
  const totalPayable = Object.values(payableAging.buckets).reduce((sum, v) => sum + Number(v), 0);
  const totalOverdueCount = receivableOverdueCount + payableOverdueCount;

  const rows = activeAging.contacts
    .filter((c) => !overdueOnly || overdueAmount(c) > 0)
    .slice()
    .sort((a, b) => Number(b.total) - Number(a.total));

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Dena-Pawna</h1>
        <p className="mt-1 text-sm text-neutral-500">Who owes you, and who you owe.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Total Receivable</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-brand-primary">{formatCurrency(totalReceivable, currency)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Total Payable</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-brand-danger">{formatCurrency(totalPayable, currency)}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Overdue</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-neutral-800">{totalOverdueCount}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setTab("RECEIVABLE")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === "RECEIVABLE" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Receivable — টাকা পাবো
          </button>
          <button
            type="button"
            onClick={() => setTab("PAYABLE")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === "PAYABLE" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Payable — টাকা দেব
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="h-4 w-4 rounded" />
          Overdue only
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm shadow-black/5">
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">
            {overdueOnly ? "Nothing overdue." : "Nothing outstanding right now."}
          </p>
        ) : (
          <div className="divide-y divide-neutral-50">
            {rows.map((row) => {
              const paid = Number(row.totalPaid);
              const invoiced = Number(row.totalInvoiced);
              const percent = invoiced > 0 ? Math.min(100, (paid / invoiced) * 100) : 0;
              const isRowOverdue = overdueAmount(row) > 0;
              return (
                <div
                  key={row.contactId}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/contacts/${row.contactId}`)}
                  onKeyDown={(e) => e.key === "Enter" && router.push(`/contacts/${row.contactId}`)}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-neutral-50/60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-500">
                    {contactInitials(row.contactName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">{row.contactName}</p>
                    <div className="mt-1 h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-neutral-100">
                      <div className={`h-full rounded-full ${tab === "RECEIVABLE" ? "bg-brand-primary" : "bg-brand-danger"}`} style={{ width: `${percent}%` }} />
                    </div>
                    {isRowOverdue && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-brand-danger">
                        <AlertTriangle className="h-3 w-3" /> Overdue
                      </span>
                    )}
                  </div>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${tab === "RECEIVABLE" ? "text-brand-primary" : "text-brand-danger"}`}>
                    {formatCurrency(row.total, currency)}
                  </span>
                  {canManage && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentTarget(row.contactId);
                      }}
                      className="shrink-0 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                    >
                      Record Payment
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {paymentTarget && (
        <RecordPaymentModal
          open={!!paymentTarget}
          onClose={() => setPaymentTarget(null)}
          businessId={businessId}
          contactId={paymentTarget}
          direction={tab}
          currency={currency}
        />
      )}
    </div>
  );
}
