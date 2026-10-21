"use client";

import { Landmark } from "lucide-react";
import Link from "next/link";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { formatCurrency } from "@/lib/customer/currency";
import type { NetWorth } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface LoansNoteProps {
  worth: NetWorth;
  // How many contacts you owe money to.
  youOweCount: number;
  currency: string;
}

// The orange note under What changed: what the loans mean for the figures,
// and the way to them while Loans is switched on.
export function LoansNote({ worth, youOweCount, currency }: LoansNoteProps) {
  const { t, locale } = useLocale();
  const loansOn = useFeature("loan_management");
  if (worth.youOwe <= 0 && worth.owedToYou <= 0) return null;

  const youOwe = formatCurrency(worth.youOwe, currency);
  const owedSentence =
    youOweCount === 0
      ? t("You owe {amount}.", { amount: youOwe })
      : t(youOweCount === 1 ? "You owe {amount} to {count} contact." : "You owe {amount} to {count} contacts.", { amount: youOwe, count: formatCount(youOweCount, locale) });

  return (
    <div className="mx-6 mt-4 mb-6 flex items-center gap-3 rounded-md bg-pillar-loans-soft p-4 text-small text-pillar-loans">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface">
        <Landmark className="size-4.5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col items-start gap-1">
        <span>
          {worth.youOwe > 0 ? (
            <>
              <b>{owedSentence}</b> {t("Clearing it would lift your net worth by the same amount.")}
            </>
          ) : (
            <>
              <b>{t("{amount} is owed to you.", { amount: formatCurrency(worth.owedToYou, currency) })}</b> {t("Collecting it would move that into your wallets.")}
            </>
          )}
        </span>
        {loansOn && (
          <Link href="/loan-management/dashboard" className="inline-flex min-h-6 items-center font-semibold underline-offset-4 hover:underline">
            {t("See loans")}
          </Link>
        )}
      </span>
    </div>
  );
}
