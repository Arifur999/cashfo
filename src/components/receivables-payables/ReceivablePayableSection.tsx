"use client";

import { AlertTriangle, Plus } from "lucide-react";
import { useState } from "react";
import type { ContactCategory, DirectionBreakdown } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { RecordInvoiceModal } from "./RecordInvoiceModal";
import { RecordPaymentModal } from "./RecordPaymentModal";

interface ReceivablePayableSectionProps {
  businessId: string;
  contactId: string;
  contactCategory: ContactCategory;
  direction: "RECEIVABLE" | "PAYABLE";
  breakdown: DirectionBreakdown;
  currency: string;
  canManage: boolean;
}

export function ReceivablePayableSection({
  businessId,
  contactId,
  contactCategory,
  direction,
  breakdown,
  currency,
  canManage,
}: ReceivablePayableSectionProps) {
  const { t } = useLocale();
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const isLoan = contactCategory === "LOAN";

  // This heading is an intentionally bilingual label (always shows the
  // Bangla gloss inline, in both locales) -- mirrors the identical
  // hardcoded text in DenaPawnaPageClient.tsx, so it's left untranslated
  // here too rather than run through t().
  const heading = direction === "RECEIVABLE" ? "Receivable — টাকা পাবো" : "Payable — টাকা দেব";
  const remainingColor = direction === "RECEIVABLE" ? "text-brand-primary" : "text-brand-danger";
  const invoiceButtonLabel = isLoan
    ? direction === "RECEIVABLE"
      ? t("Give a Loan")
      : t("Take a Loan")
    : direction === "RECEIVABLE"
      ? t("Record Sale on Credit")
      : t("Record Purchase on Credit");

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">{heading}</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-neutral-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("Total Owed")}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-neutral-800">{formatCurrency(breakdown.totalInvoiced, currency)}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("Total Paid")}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-neutral-800">{formatCurrency(breakdown.totalPaid, currency)}</p>
        </div>
        <div className="rounded-xl bg-neutral-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("Remaining")}</p>
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
            <Plus className="h-3.5 w-3.5" /> {t("Record Payment")}
          </button>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {breakdown.transactions.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-neutral-400">{t("Nothing recorded yet.")}</p>
        ) : (
          <div className="divide-y divide-neutral-50">
            {breakdown.transactions.map((entry) => {
              const original = Number(entry.originalAmount);
              const paid = Number(entry.amountPaid);
              const percent = original > 0 ? Math.min(100, (paid / original) * 100) : 0;
              return (
                <div key={entry.transactionId} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-800">{entry.description ?? t("Untitled")}</p>
                      <p className="text-xs text-neutral-400">
                        {new Date(entry.date).toLocaleDateString()}
                        {entry.dueDate && (
                          <span>
                            {" "}
                            · {t("Due")} {new Date(entry.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-neutral-800">{formatCurrency(entry.remainingAmount, currency)}</p>
                      <p className="text-xs text-neutral-400">
                        {t("of")} {formatCurrency(entry.originalAmount, currency)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div className="h-full rounded-full bg-brand-primary" style={{ width: `${percent}%` }} />
                  </div>
                  {entry.isOverdue && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-danger">
                      <AlertTriangle className="h-3 w-3" /> {t("Overdue")}
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
        contactCategory={contactCategory}
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
