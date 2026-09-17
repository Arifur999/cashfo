"use client";

import Link from "next/link";
import type { AgingReport } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AgingReportPageClientProps {
  title: string;
  report: AgingReport;
  currency: string;
  accentColor: "text-brand-primary" | "text-brand-danger";
}

const BUCKETS: { key: keyof AgingReport["buckets"]; label: string }[] = [
  { key: "current", label: "Current (not yet due)" },
  { key: "days1to30", label: "1-30 Days Overdue" },
  { key: "days31to60", label: "31-60 Days Overdue" },
  { key: "over60", label: "60+ Days Overdue" },
];

export function AgingReportPageClient({ title, report, currency, accentColor }: AgingReportPageClientProps) {
  const { t } = useLocale();
  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">{t(title)}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("Outstanding balances grouped by how overdue they are.")}</p>

      <div className="mt-6 space-y-4">
        {BUCKETS.map((bucket) => {
          const rows = report.contacts.filter((c) => Number(c[bucket.key]) > 0);
          return (
            <div key={bucket.key} className="overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
              <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                <span className="text-sm font-semibold text-neutral-900">{t(bucket.label)}</span>
                <span className={`text-sm font-bold tabular-nums ${accentColor}`}>{formatCurrency(report.buckets[bucket.key], currency)}</span>
              </div>
              {rows.length === 0 ? (
                <p className="px-4 py-4 text-sm text-neutral-400">{t("Nothing in this bucket.")}</p>
              ) : (
                <div className="divide-y divide-neutral-50">
                  {rows.map((row) => (
                    <Link
                      key={row.contactId}
                      href={`/contacts/${row.contactId}`}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-neutral-50/60"
                    >
                      <span className="text-sm text-neutral-700">{row.contactName}</span>
                      <span className="text-sm font-medium tabular-nums text-neutral-700">{formatCurrency(row[bucket.key], currency)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
