"use client";

import { ChartColumn, Plus } from "lucide-react";
import { Outfit } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useAddActions } from "@/components/modules/Customer/Layout/AddActionsProvider";
import PageFrame from "@/components/smartly/PageFrame";
import type { AddActionKey } from "@/lib/customer/addActions";
import { type Period, periodHref } from "@/lib/customer/period";
import { PeriodPicker } from "@/components/modules/Customer/Shared/PeriodPicker";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PhoneFigures, SetupFigures } from "./HomeHero";
import { AiSummaryLine, AssetsCard, CashFlowCard, GoalsCard, KpiCards, LoansCard, NetWorthHero, UpcomingEventsCard, useAmountsHidden, WealthCard } from "./DashboardCards";
import { WalletsCard } from "./HomeMoney";
import { SetupGuide } from "./HomeSetup";
import type { HomeData } from "./homeTypes";
import { IncomeExpenseChart } from "./IncomeExpenseChart";
import { PeriodSwitch } from "./PeriodSwitch";
import { RecentTransactionsCard } from "./RecentTransactionsCard";
import { SpendingCard } from "./SpendingCard";

// The premium skin's display type (globals.css, data-skin="premium").
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-outfit" });

// The Money Tracker's Dashboard, as the design-v4 boards draw it: the
// profile card and this period's figures, Income vs Expense and spending by
// category, the newest transactions beside the wallets, then the budget,
// savings goals and loans & assets. A new account (no wallet or no
// transaction yet) gets the DashboardEmpty board: the four setup steps,
// plain figures and empty cards. Phones get the DashboardMobile board's
// shorter cards and the shell's floating button instead of New transaction.
export function HomePageClient({ data }: { data: HomeData }) {
  const { t } = useLocale();
  // The shell's own Add actions: one transaction drawer, however it opens.
  const { actions, run } = useAddActions();
  const add = (key: AddActionKey) => {
    const action = actions.find((candidate) => candidate.key === key);
    if (action) run(action);
  };
  const setup = data.setup !== null;
  const router = useRouter();
  const [isSwitching, startSwitch] = useTransition();
  const [hidden, toggleHidden] = useAmountsHidden();
  const thisMonth: Period = { kind: "month", year: Number(data.today.slice(0, 4)), month: Number(data.today.slice(5, 7)) };
  const title = `${t(data.greeting)}, ${data.firstName}`;

  // Only an owner or accountant can post (the API refuses anyone else), so
  // only they get the button.
  const newTransaction = data.canManage && (
    <button
      type="button"
      onClick={() => add("expense")}
      className="hidden h-10 shrink-0 items-center gap-1.5 rounded-full bg-emerald px-4 text-body font-semibold whitespace-nowrap text-on-action shadow-button transition-colors hover:bg-emerald-hover md:flex"
    >
      <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
      {t("New transaction")}
    </button>
  );

  return (
    <PageFrame data-skin="premium" className={cn(outfit.variable, "gap-4 md:gap-6")}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5 md:gap-1">
          <h1 className={cn("leading-[1.3] font-semibold text-ink", setup ? "text-[20px] tracking-[-0.01em] md:text-page-title" : "text-[20px] tracking-[-0.01em] md:text-[30px] md:leading-[1.2] md:tracking-[-0.03em]")}>{title}</h1>
          <p className="text-[13px] leading-[normal] text-ink-muted md:text-body">
            {setup ? (
              t("Welcome to Money Tracker. Let's get your money organized.")
            ) : (
              <>
                <span className="md:hidden">{data.period.label}</span>
                <span className="max-md:hidden">{t("Here is your money at a glance · {period}", { period: data.period.label })}</span>
                {data.hijri && <span className="text-ink-faint">{` · ${data.hijri}`}</span>}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5 max-md:hidden">
          {!setup && (
            <>
              <PeriodPicker period={data.period.picked} today={data.today} activeMonths={data.activeMonths} defaultPeriod={thisMonth} onPick={(next) => startSwitch(() => router.push(periodHref("/dashboard", {}, next, thisMonth), { scroll: false }))} busy={isSwitching} align="end" />
              <Link href="/reports/detailed" className="flex h-10 shrink-0 items-center gap-1.75 rounded-full border border-input bg-surface px-4 text-body font-semibold whitespace-nowrap text-ink hover:bg-surface-sunken">
                <ChartColumn className="size-4 text-ink-soft" aria-hidden="true" />
                {t("Reports")}
              </Link>
            </>
          )}
          {newTransaction}
        </div>
      </div>

      {setup ? (
        <>
          <SetupGuide data={data} onAddTransaction={() => add("expense")} />
          <SetupFigures data={data} />
          <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
            <IncomeExpenseChart points={data.chart} currency={data.currency} onAdd={data.canManage ? () => add("expense") : undefined} />
            <SpendingCard data={data} />
          </div>
          <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
            <RecentTransactionsCard businessId={data.businessId} transactions={data.recentTransactions} categoriesById={data.categoriesById} currency={data.currency} canManage={data.canManage} onAdd={() => add("expense")} />
            <WalletsCard data={data} />
          </div>
        </>
      ) : (
        <>
          <PeriodSwitch variant="chips" value={data.period.key} dateFrom={data.period.dateFrom} dateTo={data.period.dateTo} today={data.today} className="md:hidden" />
          <PhoneFigures data={data} />
          <AiSummaryLine data={data} />
          <div className="grid gap-4 max-md:hidden xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <NetWorthHero data={data} hidden={hidden} onToggle={toggleHidden} />
            <WealthCard data={data} hidden={hidden} />
          </div>
          <div className="max-md:hidden">
            <KpiCards data={data} />
          </div>
          <div className="grid gap-4 max-md:hidden xl:grid-cols-3">
            <CashFlowCard data={data} />
            <SpendingCard data={data} />
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <IncomeExpenseChart points={data.chart} currency={data.currency} onAdd={data.canManage ? () => add("expense") : undefined} />
            <div className="max-md:hidden">
              <UpcomingEventsCard data={data} />
            </div>
            <div className="md:hidden">
              <SpendingCard data={data} />
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <RecentTransactionsCard businessId={data.businessId} transactions={data.recentTransactions} categoriesById={data.categoriesById} currency={data.currency} canManage={data.canManage} onAdd={() => add("expense")} />
            <WalletsCard data={data} variant="accounts" hidden={hidden} />
          </div>
          <div className="grid gap-4 max-md:hidden md:grid-cols-2 xl:grid-cols-3">
            <GoalsCard data={data} />
            {data.loans && <LoansCard data={data} hidden={hidden} />}
            <AssetsCard data={data} hidden={hidden} />
          </div>
        </>
      )}
    </PageFrame>
  );
}
