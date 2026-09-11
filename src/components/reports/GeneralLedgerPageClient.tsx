"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { accountDisplayName, ACCOUNT_TYPE_LABELS } from "@/lib/accountDisplay";
import type { GeneralLedgerGroup, LanguagePreference } from "@/lib/api";
import { formatCurrency } from "@/lib/currency";

interface GeneralLedgerPageClientProps {
  groups: GeneralLedgerGroup[];
  preferredLanguage: LanguagePreference;
  currency: string;
}

// Links each account out to /accounts/:id for its full statement rather
// than inlining every entry here -- see ReportsService.getGeneralLedger()'s
// comment on the backend for why (keeps this page's response light
// regardless of how much activity any one account has).
export function GeneralLedgerPageClient({ groups, preferredLanguage, currency }: GeneralLedgerPageClientProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(groups.map((g) => g.accountType)));

  function toggleSection(accountType: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(accountType)) next.delete(accountType);
      else next.add(accountType);
      return next;
    });
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">General Ledger</h1>
      <p className="mt-1 text-sm text-neutral-500">Every account in this workspace, grouped by type. Click one for its full statement.</p>

      <div className="mt-6 space-y-4">
        {groups.map((group) => {
          const isOpen = openSections.has(group.accountType);
          return (
            <div key={group.accountType} className="rounded-2xl bg-surface shadow-sm shadow-black/5">
              <button type="button" onClick={() => toggleSection(group.accountType)} className="flex w-full items-center justify-between px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {ACCOUNT_TYPE_LABELS[group.accountType]}
                </span>
                <span className="text-xs text-neutral-400">{group.accounts.length} account(s)</span>
              </button>
              {isOpen && (
                <div className="border-t border-neutral-50">
                  {group.accounts.length === 0 ? (
                    <p className="px-4 py-4 text-sm text-neutral-400">No accounts.</p>
                  ) : (
                    group.accounts.map((a) => (
                      <Link
                        key={a.id}
                        href={`/accounts/${a.id}`}
                        className="flex items-center justify-between border-b border-neutral-50 px-4 py-2.5 last:border-0 hover:bg-neutral-50/60"
                      >
                        <span className={`text-sm ${a.status === "ARCHIVED" ? "text-neutral-400 line-through" : "text-neutral-800"}`}>
                          {accountDisplayName(a, preferredLanguage)}
                        </span>
                        <span className="text-sm font-medium tabular-nums text-neutral-700">{formatCurrency(a.currentBalance, currency)}</span>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
