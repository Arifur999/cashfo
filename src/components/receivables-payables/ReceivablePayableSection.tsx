"use client";

import { AlertTriangle, Plus } from "lucide-react";
import { useState } from "react";
import type { DirectionBreakdown } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { RecordInvoiceModal } from "./RecordInvoiceModal";
import { RecordPaymentModal } from "./RecordPaymentModal";

interface ReceivablePayableSectionProps {
  businessId: string;
  contactId: string;
  direction: "RECEIVABLE" | "PAYABLE";
  breakdown: DirectionBreakdown;
  currency: string;
  canManage: boolean;
}

export function ReceivablePayableSection({ businessId, contactId, direction, breakdown, currency, canManage }: ReceivablePayableSectionProps) {
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const heading = direction === "RECEIVABLE" ? "Receivable — টাকা পাবো" : "Payable — টাকা দেব";
  const remainingColor = direction === "RECEIVABLE" ? "text-brand-primary" : "text-brand-danger";
  const invoiceButtonLabel = direction === "RECEIVABLE" ? "Record Sale on Credit" : "Record Purchase on Credit";

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">{heading}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-neutral-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Total Owed</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-neutral-800">{formatCurrency(breakdown.totalInvoiced, currency)}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Total Paid</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-neutral-800">{formatCurrency(breakdown.totalPaid, currency)}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Remaining</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${remainingColor}`}>{formatCurrency(breakdown.remaining, currency)}</p>
        </div>
      </div>

      {canManage && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setInvoiceModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Plus className="h-3.5 w-3.5" /> {invoiceButtonLabel}
          </button>
          <button
            type="button"
            onClick={() => setPaymentModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-primary px-3 py-2 text-sm font-medium text-white hover:bg-brand-primary-hover"
          >
            <Plus className="h-3.5 w-3.5" /> Record Payment
          </button>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {breakdown.transactions.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-400">Nothing recorded yet.</p>
        ) : (
          <div className="divide-y divide-neutral-50">
            {breakdown.transactions.map((t) => {
              const original = Number(t.originalAmount);
              const paid = Number(t.amountPaid);
              const percent = original > 0 ? Math.min(100, (paid / original) * 100) : 0;
              return (
                <div key={t.transactionId} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-800">{t.description ?? "Untitled"}</p>
                      <p className="text-xs text-neutral-400">
                        {new Date(t.date).toLocaleDateString()}
                        {t.dueDate && <span> · Due {new Date(t.dueDate).toLocaleDateString()}</span>}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-neutral-800">{formatCurrency(t.remainingAmount, currency)}</p>
                      <p className="text-xs text-neutral-400">of {formatCurrency(t.originalAmount, currency)}</p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-brand-primary" style={{ width: `${percent}%` }} />
                  </div>
                  {t.isOverdue && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-danger">
                      <AlertTriangle className="h-3 w-3" /> Overdue
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <RecordInvoiceModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        businessId={businessId}
        contactId={contactId}
        direction={direction}
      />
      <RecordPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        businessId={businessId}
        contactId={contactId}
        direction={direction}
        currency={currency}
      />
    </div>
  );
}
