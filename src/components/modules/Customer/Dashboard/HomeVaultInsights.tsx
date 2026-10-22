"use client";

import { Lock, TrendingUp, Utensils } from "lucide-react";
import Link from "next/link";
import { createElement } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";
import SectionHeader from "@/components/smartly/SectionHeader";
import { categoryIconFor } from "@/lib/customer/budgetCategoryVisuals";
import { formatCurrency } from "@/lib/customer/currency";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { HomePartError } from "./HomePartError";
import { PhoneVaultInsights } from "./HomePhone";
import { SectionLink } from "./SectionLink";
import type { HomeData } from "./homeTypes";

// Bangla's vowel signs need more room than these fixed lines when they wrap.
const BN_LEADING = "[.font-bn_&]:leading-normal";

// The foot of Home: the password vault beside what this month's numbers
// say (phones: two short cards).
export function HomeVaultInsights({ data }: { data: HomeData }) {
  const { t, locale } = useLocale();
  const { vault } = data;
  const logins = vault?.entryCount;
  // "Locked · 14 logins" once the backend says how many there are.
  const lockedTitle = logins === undefined ? t("Locked") : `${t("Locked")} · ${t(logins === 1 ? "{count} login" : "{count} logins", { count: formatCount(logins, locale) })}`;

  return (
    <>
      <PhoneVaultInsights data={data} />
      <div className="hidden gap-6 md:grid lg:grid-cols-2">
        <section aria-labelledby="h-vault" className="flex flex-col gap-4">
          {/* "Vault", as the menu calls it: Settings has a Security page of its own. */}
          <SectionHeader id="h-vault" eyebrow={t("Vault")} tone="vault" title={t("Password vault")} />
          {data.unavailable.includes("vault") ? (
            <Card padding="none" className="flex-1">
              <HomePartError />
            </Card>
          ) : (
            <Card className="flex flex-1 flex-wrap items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
                <Lock className="size-6.5" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <b className="text-title leading-5.5 font-bold text-ink">{vault?.hasVaultPassword ? lockedTitle : t("Not set up yet")}</b>
                <span className={cn("text-small leading-4.5 text-ink-muted", BN_LEADING)}>{vault?.hasVaultPassword ? t("Your logins are behind the vault password.") : t("Keep every login behind its own vault password.")}</span>
              </span>
              <Button variant="action" size="lg" asChild>
                <Link href="/password-manager">{vault?.hasVaultPassword ? t("Unlock vault") : t("Set up the vault")}</Link>
              </Button>
            </Card>
          )}
        </section>
        <section aria-labelledby="h-ins" className="flex flex-col gap-4">
          <SectionHeader id="h-ins" eyebrow={t("Insights")} tone="insights" title={t("What your numbers say")} aside={<SectionLink href="/reports/overview" phone={t("Open insights")} wide={t("Open insights")} arrow />} />
          <Card padding="none" className="flex flex-1 flex-col">
            <Insights data={data} />
          </Card>
        </section>
      </div>
    </>
  );
}

function Insights({ data }: { data: HomeData }) {
  const { t, locale } = useLocale();
  const { topIncome, topExpense, currency } = data;

  if (!topIncome && !topExpense) {
    return (
      <p className="p-5 text-body text-ink-muted">
        {/* A new account hears what this card will do; someone with history,
            early in a month with nothing in it yet, hears just that. */}
        {data.setup ? t("After a few transactions, Smartly explains them here.") : t("Nothing recorded in {month} yet.", { month: data.monthName })}
      </p>
    );
  }

  const expenseIcon = topExpense ? categoryIconFor(data.categoriesById[topExpense.name] ?? { icon: null, name: topExpense.name }) : Utensils;
  const amount = topExpense ? formatCurrency(topExpense.amount, currency, locale) : "";
  const delta = topExpense?.delta ?? null;
  // Against the same days of last month, so the 5th is weighed against
  // 1–5 September rather than the whole of it.
  const spendLine =
    delta === null
      ? t("{amount} this month.", { amount })
      : delta === 0
        ? t("{amount} this month, the same as this time in {month}.", { amount, month: data.lastMonthName })
        : t(delta < 0 ? "{amount} this month, {delta} less than this time in {month}." : "{amount} this month, {delta} more than this time in {month}.", {
            amount,
            delta: formatCurrency(Math.abs(delta), currency, locale),
            month: data.lastMonthName,
          });

  return (
    <>
      {topIncome && (
        <InsightRow icon={<TrendingUp />} tone="insights" title={t("{name} is {percent}% of your income this month.", { name: topIncome.name, percent: toLocaleDigits(String(topIncome.percent), locale) })} text={t("Your biggest source of money in.")} />
      )}
      {topExpense && (
        <InsightRow
          icon={createElement(expenseIcon)}
          tone="loans"
          title={t("{name} is your biggest spend: {percent}%.", { name: topExpense.name, percent: toLocaleDigits(String(topExpense.percent), locale) })}
          text={spendLine}
          divided={Boolean(topIncome)}
        />
      )}
    </>
  );
}

function InsightRow({ icon, tone, title, text, divided = false }: { icon: React.ReactNode; tone: "insights" | "loans"; title: string; text: string; divided?: boolean }) {
  return (
    <div className={cn("flex items-start gap-4 px-5 py-4", divided && "border-t border-divider")}>
      <IconTile tone={tone}>{icon}</IconTile>
      <span className="flex flex-col gap-0.5">
        <b className={cn("text-title leading-5.5 font-semibold text-ink", BN_LEADING)}>{title}</b>
        <span className={cn("text-small leading-4.5 text-ink-muted", BN_LEADING)}>{text}</span>
      </span>
    </div>
  );
}
