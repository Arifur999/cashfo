"use client";

import { ArrowDownLeft, ArrowUpRight, CircleCheckBig, CreditCard, UserPlus } from "lucide-react";
import Link from "next/link";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";
import KpiTile from "@/components/smartly/KpiTile";
import SectionHeader from "@/components/smartly/SectionHeader";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { HomePartError } from "./HomePartError";
import { PhoneLoanCards } from "./HomePhone";
import { SectionLink } from "./SectionLink";
import type { HomeData } from "./homeTypes";

// Dena-pawna on Home: what others owe you, what you owe, where that leaves
// you and how many people it is with, in the words of Loans › Overview.
// The figures carry their sign, as on the Dashboard boards ("+৳1,25,000",
// "−৳6,00,000") and like Net position beside them, so the direction never
// rests on colour alone. Someone who never lent or borrowed gets one card
// saying what the section is for instead of four zeros.
export function HomeLoans({ data }: { data: HomeData }) {
  const { t, locale } = useLocale();
  const { currency, loans, loanCounts: counts } = data;
  const failed = data.unavailable.includes("loans");
  const empty = !loans || loans.rows.length === 0;
  const net = Number(loans?.netBalance ?? 0);

  return (
    <section aria-labelledby="h-loans" className="flex flex-col gap-3 md:gap-4">
      <SectionHeader
        id="h-loans"
        eyebrow={t("Loans")}
        tone="loans"
        // Its own key: in Bangla "Loans" already reads দেনা-পাওনা above it.
        title={t("Dena-pawna@@home")}
        aside={
          <>
            <SectionLink href="/loan-management/dashboard" phone={t("Open")} wide={t("Open loans")} />
            {data.canManage && !failed && !empty && (
              <Button variant="action" size="lg" asChild className="hidden md:inline-flex">
                {/* ?new=1 asks Payments to open its New loan entry drawer
                    straight away, so the button does what it says. */}
                <Link href="/loan-management/transactions?new=1">{t("Record a payment")}</Link>
              </Button>
            )}
          </>
        }
      />
      {failed ? (
        <Card padding="none">
          <HomePartError />
        </Card>
      ) : empty ? (
        <Card className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <IconTile tone="loans" size={40}>
            <CreditCard />
          </IconTile>
          <span className="flex-1 text-body text-ink-2">{t("Keep track of who owes you, and whom you owe.")}</span>
          {data.canManage && (
            <Button variant="action" size="lg" asChild className="w-full sm:w-auto">
              <Link href="/loan-management/bank-person-list">
                <UserPlus />
                {t("Add a person or bank")}
              </Link>
            </Button>
          )}
        </Card>
      ) : (
        <>
          <PhoneLoanCards loans={loans} counts={counts} currency={currency} />
          <div className="hidden gap-4 sm:grid-cols-2 md:grid lg:grid-cols-4 lg:gap-6">
            <KpiTile icon={<ArrowDownLeft />} tone="income" label={t("Owed to you · pawna")} value={<AmountText value={Math.abs(Number(loans.totalPawna))} currency={currency} size="lg" tone="income" signed className="leading-8" />}>
              {t(counts.oweYou === 1 ? "From {count} person" : "From {count} people", { count: formatCount(counts.oweYou, locale) })}
            </KpiTile>
            <KpiTile icon={<ArrowUpRight />} tone="expense" label={t("You owe · dena")} value={<AmountText value={-Math.abs(Number(loans.totalDena))} currency={currency} size="lg" tone="expense" signed className="leading-8" />}>
              {t(counts.youOwe === 1 ? "To {count} person" : "To {count} people", { count: formatCount(counts.youOwe, locale) })}
            </KpiTile>
            <KpiTile icon={<CreditCard />} tone="loans" label={t("Net position")} value={<AmountText value={net} currency={currency} size="lg" signed className="leading-8" />}>
              {net > 0 ? t("You're owed more than you owe") : net < 0 ? t("You owe more than you're owed") : t("All square")}
            </KpiTile>
            {/* People with a balance either way; a settled one has none. */}
            <KpiTile icon={<CircleCheckBig />} tone="warning" label={t("Active loans")} value={<span className="text-amount-lg leading-8 text-ink tabular-nums">{formatCount(counts.oweYou + counts.youOwe, locale)}</span>}>
              {t("People and banks with a balance")}
            </KpiTile>
          </div>
        </>
      )}
    </section>
  );
}
