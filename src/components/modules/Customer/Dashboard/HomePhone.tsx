"use client";

import { Check, Lock, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useTodayTasks } from "@/components/modules/Customer/Providers/TodayTasksProvider";
import AmountText from "@/components/smartly/AmountText";
import Card from "@/components/smartly/Card";
import Eyebrow from "@/components/smartly/Eyebrow";
import IconTile from "@/components/smartly/IconTile";
import ProgressBar from "@/components/smartly/ProgressBar";
import { budgetTone } from "@/lib/budgetTone";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import type { HomeData } from "./homeTypes";

// Home on a phone: the board's shorter cards, two to a row, in place of the
// full sections HomePageClient shows from md up. The board sets these lines
// without a line height ("normal"), so a line with a taka sign in it stands
// taller than one without; leading-[normal] reproduces that.

const LABEL = "text-small leading-[normal] text-ink-muted";
const FIGURE = "text-h3 leading-[normal] font-bold";
const NOTE = "truncate text-caption leading-[normal] font-normal text-ink-muted";
const PLAIN = "leading-[normal]";

const BUDGET_NOTE = { income: "", warning: "font-semibold text-warning", expense: "font-semibold text-expense" } as const;

// A half-width card; a link when it leads somewhere.
function CompactCard({ href, tight = false, children }: { href?: string; tight?: boolean; children: React.ReactNode }) {
  const className = cn("flex min-w-0 flex-col p-4", tight ? "gap-1" : "gap-2");
  return href ? (
    <Card asChild interactive elevated={false} padding="none" className={className}>
      <Link href={href}>{children}</Link>
    </Card>
  ) : (
    <Card elevated={false} padding="none" className={className}>
      {children}
    </Card>
  );
}

function Pair({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:hidden">{children}</div>;
}

// Savings goals and the budget closest to its limit, under the list.
export function PhoneMoneyCards({ data }: { data: HomeData }) {
  const { t } = useLocale();
  const { currency, budgetFocus: focus } = data;
  const left = Number(focus?.monthlyLimit ?? 0) - Number(focus?.spent ?? 0);

  return (
    <Pair>
      <CompactCard href="/savings-goals/dashboard">
        <span className={LABEL}>{t("Savings goals")}</span>
        <AmountText value={data.savingsSaved} currency={currency} className={FIGURE} />
        <ProgressBar value={data.savingsProgress} size="sm" label={t("Savings goals")} />
        <span className={NOTE}>{data.savingsTarget > 0 ? `${Math.round(data.savingsProgress)}% ${t("of")} ${formatCurrency(data.savingsTarget, currency)}` : t("No goals yet")}</span>
      </CompactCard>
      <CompactCard href="/categories">
        {focus ? (
          <>
            <span className={cn(LABEL, "truncate")}>
              {focus.name} {t("budget")}
            </span>
            <span className={cn(FIGURE, "tabular-nums")}>{left >= 0 ? `${formatCurrency(left, currency)} ${t("left")}` : `${formatCurrency(-left, currency)} ${t("over")}`}</span>
            <ProgressBar value={focus.percent} tone="budget" size="sm" label={focus.name} />
            <span className={cn(NOTE, BUDGET_NOTE[budgetTone(focus.percent)])}>
              {Math.round(focus.percent)}% {t("used")}
            </span>
          </>
        ) : (
          <>
            <span className={LABEL}>{t("Budget")}</span>
            <span className={FIGURE}>{t("No budget yet")}</span>
            <span className={NOTE}>{t("Set a monthly limit")}</span>
          </>
        )}
      </CompactCard>
    </Pair>
  );
}

// What others owe you and what you owe, side by side.
export function PhoneLoanCards({ loans, counts, currency }: { loans: NonNullable<HomeData["loans"]>; counts: HomeData["loanCounts"]; currency: string }) {
  const { t } = useLocale();
  return (
    <Pair>
      <CompactCard tight>
        <span className={LABEL}>
          {t("Owed to you")} · {t("pawna")}
        </span>
        <AmountText value={Number(loans.totalPawna)} currency={currency} signed tone="income" className={FIGURE} />
        <span className={NOTE}>
          {plural(t, counts.oweYou, "From {count} person", "From {count} people")}
        </span>
      </CompactCard>
      <CompactCard tight>
        <span className={LABEL}>
          {t("You owe")} · {t("dena")}
        </span>
        <AmountText value={-Number(loans.totalDena)} currency={currency} signed tone="expense" className={FIGURE} />
        <span className={NOTE}>
          {plural(t, counts.youOwe, "To {count} person", "To {count} people")}
        </span>
      </CompactCard>
    </Pair>
  );
}

// Today's five prayers as rings, and a line of the other habits.
export function PhonePrayers({ data, prayers, done, href }: { data: HomeData; prayers: string[]; done: string[]; href: string }) {
  const { t } = useLocale();
  const { openCount } = useTodayTasks();
  const streak = data.skills?.streak ?? 0;

  return (
    <Card elevated={false} padding="none" className="flex flex-col gap-4 p-4 md:hidden">
      <div className="grid grid-cols-5 gap-2">
        {prayers.map((prayer) => {
          const ticked = done.includes(prayer);
          return (
            <Link key={prayer} href={href} aria-label={`${t(prayer)}: ${ticked ? t("Done") : t("Not yet")}`} className="flex flex-col items-center gap-2">
              <span className={cn("flex size-9 items-center justify-center rounded-full", ticked ? "bg-emerald text-white" : "border-[1.5px] border-dashed border-line-strong bg-surface")}>
                {ticked && <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />}
              </span>
              <span className={cn("text-caption font-semibold text-ink", PLAIN)}>{t(prayer)}</span>
            </Link>
          );
        })}
      </div>
      <span className={cn("flex justify-between gap-2 text-small text-ink-muted", PLAIN)}>
        <span>
          {t("Daily habits")} <b className="font-bold text-ink">{data.dailyChallenges}</b>
        </span>
        <span>
          {t("To-do")}{" "}
          <b className="font-bold text-ink">
            {openCount} {t("left")}
          </b>
        </span>
        {data.reading ? (
          <span>
            {t("Reading")} <b className="font-bold text-ink">{Math.round((data.reading.pagesRead / Math.max(1, data.reading.totalPages)) * 100)}%</b>
          </span>
        ) : (
          <span>
            {t("Skills")}{" "}
            <b className="font-bold text-ink">
              {streak} {t(streak === 1 ? "day" : "days")}
            </b>
          </span>
        )}
      </span>
    </Card>
  );
}

// The vault and the month's headline insight, at the foot of Home.
export function PhoneVaultInsights({ data }: { data: HomeData }) {
  const { t } = useLocale();
  const { vault, topIncome, topExpense } = data;
  const logins = vault?.entryCount;

  return (
    <Pair>
      <CompactCard href="/password-manager">
        <Eyebrow tone="vault" className={PLAIN}>
          {t("Security")}
        </Eyebrow>
        <IconTile tone="vault">
          <Lock />
        </IconTile>
        <b className={cn("text-body font-bold text-ink", PLAIN)}>{vault?.hasVaultPassword ? t("Vault locked") : t("Vault not set up")}</b>
        <span className={NOTE}>{logins === undefined ? t("Password vault") : `${logins} ${t(logins === 1 ? "login" : "logins")}`}</span>
      </CompactCard>
      <CompactCard href="/reports/overview">
        <Eyebrow tone="insights" className={PLAIN}>
          {t("Insights")}
        </Eyebrow>
        <IconTile tone="insights">
          <TrendingUp />
        </IconTile>
        <b className={cn("text-body font-bold text-ink", PLAIN)}>{topIncome ? `${topIncome.name} ${t("is")} ${topIncome.percent}% ${t("of income")}` : t("No insights yet")}</b>
        <span className={NOTE}>{topExpense ? `${topExpense.name} ${t("is your biggest spend")}` : t("After a few transactions")}</span>
      </CompactCard>
    </Pair>
  );
}
