"use client";

import { Plus } from "lucide-react";
import { useAddActions } from "@/components/modules/Customer/Layout/AddActionsProvider";
import PageFrame from "@/components/smartly/PageFrame";
import type { AddActionKey } from "@/lib/customer/addActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceCard, FlowCard, PhoneFigures, ProfileCard, SavedCard, SetupFigures } from "./HomeHero";
import { BudgetCard, LoansAssetsCard, SavingsCard, WalletsCard } from "./HomeMoney";
import { SetupGuide } from "./HomeSetup";
import type { HomeData } from "./homeTypes";
import { IncomeExpenseChart } from "./IncomeExpenseChart";
import { PeriodSwitch } from "./PeriodSwitch";
import { RecentTransactionsCard } from "./RecentTransactionsCard";
import { SpendingCard } from "./SpendingCard";

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
    <PageFrame className="gap-4 md:gap-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5 md:gap-1">
          <h1 className={cn("leading-[1.3] font-semibold text-ink", setup ? "text-[20px] tracking-[-0.01em] md:text-[24px] md:tracking-[-0.02em]" : "text-[20px] tracking-[-0.01em] md:text-[30px] md:leading-[1.2] md:tracking-[-0.03em]")}>{title}</h1>
          <p className="text-[13px] leading-[normal] text-ink-muted md:text-body">
            {setup ? (
              t("Welcome to Money Tracker. Let's get your money organized.")
            ) : (
              <>
                <span className="md:hidden">{data.period.label}</span>
                <span className="max-md:hidden">{t("Here's how your money is moving in {period}.", { period: data.period.label })}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5 max-md:hidden">
          {!setup && <PeriodSwitch variant="bar" value={data.period.key} dateFrom={data.period.dateFrom} dateTo={data.period.dateTo} today={data.today} className="max-md:hidden" />}
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
          <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-[300px_repeat(2,minmax(0,1fr))]">
            <ProfileCard data={data} onAdd={add} />
            <BalanceCard data={data} />
            <FlowCard data={data} kind="income" />
            <FlowCard data={data} kind="expense" />
            <SavedCard data={data} />
          </div>
          <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
            <IncomeExpenseChart points={data.chart} currency={data.currency} onAdd={data.canManage ? () => add("expense") : undefined} />
            <SpendingCard data={data} />
          </div>
          <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
            <RecentTransactionsCard businessId={data.businessId} transactions={data.recentTransactions} categoriesById={data.categoriesById} currency={data.currency} canManage={data.canManage} onAdd={() => add("expense")} />
            <WalletsCard data={data} />
          </div>
          <div className="hidden gap-6 md:grid md:grid-cols-2 xl:grid-cols-3">
            <BudgetCard data={data} />
            <SavingsCard data={data} />
            <LoansAssetsCard data={data} />
          </div>
        </>
      )}
    </PageFrame>
  );
}
