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
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { HomePartError } from "./HomePartError";
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

// A half-width card that couldn't be read: its name, one line, and Try again.
function FailedCompactCard({ label }: { label: string }) {
  return (
    <CompactCard>
      <span className={LABEL}>{label}</span>
      <HomePartError compact />
    </CompactCard>
  );
}

// Savings goals and the budget closest to its limit, under the list.
export function PhoneMoneyCards({ data }: { data: HomeData }) {
  const { t } = useLocale();
  const { currency, budgetFocus: focus } = data;
  const left = Number(focus?.monthlyLimit ?? 0) - Number(focus?.spent ?? 0);

  return (
    <Pair>
      {data.unavailable.includes("savings") ? (
        <FailedCompactCard label={t("Savings goals")} />
      ) : (
        <CompactCard href="/savings-goals/dashboard">
          <span className={LABEL}>{t("Savings goals")}</span>
          <AmountText value={data.savingsSaved} currency={currency} className={FIGURE} />
          <ProgressBar value={data.savingsProgress} size="sm" label={t("Savings goals")} />
          <span className={NOTE}>{data.savingsTarget > 0 ? t("{percent}% of {amount}", { percent: data.savingsProgress, amount: formatCurrency(data.savingsTarget, currency) }) : t("No goals yet")}</span>
        </CompactCard>
      )}
      {data.unavailable.includes("budget") ? (
        <FailedCompactCard label={t("Budget")} />
      ) : (
        <CompactCard href="/categories">
          {focus ? (
            <>
              <span className={cn(LABEL, "truncate")}>{t("{name} budget", { name: focus.name })}</span>
              <span className={cn(FIGURE, "tabular-nums")}>{left >= 0 ? t("{amount} left", { amount: formatCurrency(left, currency) }) : t("{amount} over", { amount: formatCurrency(-left, currency) })}</span>
              <ProgressBar value={focus.percent} tone="budget" size="sm" label={focus.name} />
              <span className={cn(NOTE, BUDGET_NOTE[budgetTone(focus.percent)])}>{t("{percent}% used", { percent: Math.round(focus.percent) })}</span>
            </>
          ) : (
            <>
              <span className={LABEL}>{t("Budget")}</span>
              <span className={FIGURE}>{t("No budget yet")}</span>
              <span className={NOTE}>{t("Set a monthly limit")}</span>
            </>
          )}
        </CompactCard>
      )}
    </Pair>
  );
}

// What others owe you and what you owe, side by side: the figures alone,
// as Loans › Overview writes them, the colour saying which way.
export function PhoneLoanCards({ loans, counts, currency }: { loans: NonNullable<HomeData["loans"]>; counts: HomeData["loanCounts"]; currency: string }) {
  const { t, locale } = useLocale();
  return (
    <Pair>
      <CompactCard tight>
        <span className={LABEL}>{t("Owed to you · pawna")}</span>
        <AmountText value={Math.abs(Number(loans.totalPawna))} currency={currency} tone="income" className={FIGURE} />
        <span className={NOTE}>{t(counts.oweYou === 1 ? "From {count} person" : "From {count} people", { count: formatCount(counts.oweYou, locale) })}</span>
      </CompactCard>
      <CompactCard tight>
        <span className={LABEL}>{t("You owe · dena")}</span>
        <AmountText value={Math.abs(Number(loans.totalDena))} currency={currency} tone="expense" className={FIGURE} />
        <span className={NOTE}>{t(counts.youOwe === 1 ? "To {count} person" : "To {count} people", { count: formatCount(counts.youOwe, locale) })}</span>
      </CompactCard>
    </Pair>
  );
}

// Today's five prayers as rings, and a line of the other habits.
export function PhonePrayers({ data, prayers, done, href }: { data: HomeData; prayers: string[]; done: string[]; href: string }) {
  const { t, locale } = useLocale();
  const { openCount, loaded } = useTodayTasks();
  const streak = data.skills?.streak ?? 0;

  return (
    <Card elevated={false} padding="none" className="flex flex-col gap-4 p-4 md:hidden">
      {data.unavailable.includes("namaz") ? (
        <HomePartError className="p-0" />
      ) : (
        <>
          <div className="grid grid-cols-5 gap-2">
            {prayers.map((prayer) => {
              const ticked = done.includes(prayer);
              return (
                <Link key={prayer} href={href} aria-label={`${t(prayer)}: ${ticked ? t("Done") : t("Not yet")}`} className="flex flex-col items-center gap-2">
                  <span className={cn("flex size-9 items-center justify-center rounded-full", ticked ? "bg-emerald text-on-action" : "border-[1.5px] border-dashed border-line-strong bg-surface")}>
                    {ticked && <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />}
                  </span>
                  <span className={cn("text-caption font-semibold text-ink", PLAIN)}>{t(prayer)}</span>
                </Link>
              );
            })}
          </div>
          {/* Without a sheet this month, five empty rings would read as five
              missed prayers. */}
          {!data.namaz && (
            <Link href={href} className={cn("-my-3 flex min-h-11 items-center self-start text-small font-semibold text-emerald hover:text-emerald-hover", PLAIN)}>
              {t("No month tracked yet")}
            </Link>
          )}
        </>
      )}
      <span className={cn("flex justify-between gap-2 text-small text-ink-muted", PLAIN)}>
        <span>
          {t("Challenges")} <b className="font-bold text-ink">{data.unavailable.includes("challenges") ? "—" : formatCount(data.challengesRunning, locale)}</b>
        </span>
        <span>
          {t("To-do")}
          {/* The count only once the list is in, never "0 left" while it loads. */}
          {loaded && (
            <>
              {" "}
              <b className="font-bold text-ink">{t("{count} left", { count: formatCount(openCount, locale) })}</b>
            </>
          )}
        </span>
        {data.reading ? (
          <span>
            {t("Reading")} <b className="font-bold text-ink">{Math.round((data.reading.pagesRead / Math.max(1, data.reading.totalPages)) * 100)}%</b>
          </span>
        ) : data.unavailable.includes("skills") ? (
          <span>
            {t("Skills")} <b className="font-bold text-ink">—</b>
          </span>
        ) : (
          // No "0 days" streak for someone not learning anything yet.
          data.skills?.hasSkills && (
            <span>
              {t("Skills")} <b className="font-bold text-ink">{t(streak === 1 ? "{count} day" : "{count} days", { count: formatCount(streak, locale) })}</b>
            </span>
          )
        )}
      </span>
    </Card>
  );
}

// The vault and the month's headline insight, at the foot of Home.
export function PhoneVaultInsights({ data }: { data: HomeData }) {
  const { t, locale } = useLocale();
  const { vault, topIncome, topExpense } = data;
  const logins = vault?.entryCount;

  return (
    <Pair>
      {data.unavailable.includes("vault") ? (
        <FailedCompactCard label={t("Password vault")} />
      ) : (
        <CompactCard href="/password-manager">
          <Eyebrow tone="vault" className={PLAIN}>
            {t("Vault")}
          </Eyebrow>
          <IconTile tone="vault">
            <Lock />
          </IconTile>
          <b className={cn("text-body font-bold text-ink", PLAIN)}>{vault?.hasVaultPassword ? t("Vault locked") : t("Vault not set up")}</b>
          <span className={NOTE}>{logins === undefined ? t("Password vault") : t(logins === 1 ? "{count} login" : "{count} logins", { count: formatCount(logins, locale) })}</span>
        </CompactCard>
      )}
      <CompactCard href="/reports/overview">
        <Eyebrow tone="insights" className={PLAIN}>
          {t("Insights")}
        </Eyebrow>
        <IconTile tone="insights">
          <TrendingUp />
        </IconTile>
        {topIncome || topExpense ? (
          <>
            <b className={cn("text-body font-bold text-ink", PLAIN)}>
              {topIncome ? t("{name} is {percent}% of income", { name: topIncome.name, percent: topIncome.percent }) : t("{name} is your biggest spend", { name: topExpense!.name })}
            </b>
            {topIncome && topExpense && <span className={NOTE}>{t("{name} is your biggest spend", { name: topExpense.name })}</span>}
          </>
        ) : data.setup ? (
          <>
            <b className={cn("text-body font-bold text-ink", PLAIN)}>{t("No insights yet")}</b>
            <span className={NOTE}>{t("After a few transactions")}</span>
          </>
        ) : (
          // A customer with history, early in a month with nothing in it yet.
          <b className={cn("text-body font-bold text-ink", PLAIN)}>{t("Nothing recorded in {month} yet.", { month: data.monthName })}</b>
        )}
      </CompactCard>
    </Pair>
  );
}
