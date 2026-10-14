"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, BookOpen, Box, ChartPie, CircleCheckBig, CreditCard, GraduationCap, Lock, PiggyBank, Plus, TrendingUp, Utensils } from "lucide-react";
import Link from "next/link";
import { createElement, useState } from "react";
import { useFeature } from "@/components/modules/Customer/Providers/PlatformProvider";
import { AddTransactionModal } from "@/components/modules/Customer/QuickEntry/AddTransactionModal";
import { TransferModal } from "@/components/modules/Customer/QuickEntry/TransferModal";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Eyebrow from "@/components/smartly/Eyebrow";
import IconTile from "@/components/smartly/IconTile";
import KpiTile from "@/components/smartly/KpiTile";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import ProgressBar from "@/components/smartly/ProgressBar";
import SectionHeader from "@/components/smartly/SectionHeader";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { HomeHero } from "./HomeHero";
import { HomeSetup } from "./HomeSetup";
import { HomeTodoCard } from "./HomeTodoCard";
import type { HomeData } from "./homeTypes";
import { IncomeSavedChart } from "./IncomeSavedChart";
import { RecentTransactionsCard } from "./RecentTransactionsCard";

const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

// Home: one section per feature -- this month on the hero, money, loans,
// habits, the vault and the insights -- or the setup steps for a new
// account.
export function HomePageClient({ data }: { data: HomeData }) {
  const { t } = useLocale();
  const loansOn = useFeature("loan_management");
  const [modal, setModal] = useState<"add" | "transfer" | null>(null);
  const { currency } = data;

  const actions = (
    <>
      <Button variant="secondary" size="lg" onClick={() => setModal("transfer")}>
        <ArrowLeftRight />
        {t("Transfer")}
      </Button>
      <Button size="lg" onClick={() => setModal("add")}>
        <Plus strokeWidth={2.25} />
        {t("Add transaction")}
      </Button>
    </>
  );

  const prayersDone = data.namaz ? data.namaz.checks.filter((c) => c.day === data.namaz!.todayDay).map((c) => c.item) : [];
  const prayerItems = data.namaz?.items.length ? data.namaz.items : PRAYERS;

  return (
    <PageFrame gap="lg">
      <PageHeader
        size="display"
        eyebrow={data.setup ? t("Welcome to Smartly") : data.dateLine}
        title={`${t(data.greeting)}, ${data.firstName}`}
        description={data.setup ? t("Three quick steps and Home fills itself in.") : t("Here is your day at a glance.")}
        actions={data.setup ? undefined : actions}
      />

      {data.setup ? (
        <HomeSetup hasWallet={data.setup.hasWallet} hasTransaction={data.setup.hasTransaction} balance={data.balance} currency={currency} onAddTransaction={() => setModal("add")} />
      ) : (
        <>
          <HomeHero {...data} />

          <section aria-labelledby="h-money" className="flex flex-col gap-4">
            <SectionHeader
              id="h-money"
              eyebrow={t("Money")}
              title={t("Income & expense")}
              aside={
                <Link href="/transactions" className="flex items-center gap-1 text-body font-semibold text-emerald hover:text-emerald-hover">
                  {t("See all transactions")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              }
            />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <IncomeSavedChart points={data.trend} currency={currency} monthName={data.monthName} />
              <RecentTransactionsCard transactions={data.recentTransactions} categoriesById={data.categoriesById} currency={currency} today={data.today} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              <Card interactive asChild className="flex flex-col gap-3">
                <Link href="/savings-goals/dashboard">
                  <span className="flex items-center gap-3 text-small font-medium text-ink-muted">
                    <IconTile tone="money">
                      <PiggyBank />
                    </IconTile>
                    {t("Savings goals")}
                  </span>
                  <span className="flex flex-wrap items-baseline gap-2">
                    <AmountText value={data.savingsSaved} currency={currency} size="lg" />
                    {data.savingsTarget > 0 && (
                      <span className="text-small text-ink-muted">
                        {t("of")} {formatCurrency(data.savingsTarget, currency)}
                      </span>
                    )}
                  </span>
                  <ProgressBar value={data.savingsProgress} label={t("Savings goals")} />
                  <span className="text-small text-ink-muted">
                    {data.goalCount} {t(data.goalCount === 1 ? "goal" : "goals")} · {Math.round(data.savingsProgress)}% {t("reached")}
                  </span>
                </Link>
              </Card>
              <Card interactive asChild className="flex flex-col gap-3">
                <Link href="/assets-management/dashboard">
                  <span className="flex items-center gap-3 text-small font-medium text-ink-muted">
                    <IconTile tone="money">
                      <Box />
                    </IconTile>
                    {t("Assets")}
                  </span>
                  <AmountText value={data.assetsValue} currency={currency} size="lg" />
                  <span className="text-small text-ink-muted">
                    {data.assetCount} {t(data.assetCount === 1 ? "asset" : "assets")}
                    {data.assetCount > 0 && (
                      <>
                        {" · "}
                        <b className={data.assetsGain >= 0 ? "text-income" : "text-expense"}>
                          {data.assetsGain >= 0 ? "↑" : "↓"} {formatCurrency(Math.abs(data.assetsGain), currency)}
                        </b>{" "}
                        {t("since you bought them")}
                      </>
                    )}
                  </span>
                </Link>
              </Card>
              <Card interactive asChild className="flex flex-col gap-3">
                <Link href="/categories">
                  <span className="flex items-center gap-3 text-small font-medium text-ink-muted">
                    <IconTile tone="warning">
                      <ChartPie />
                    </IconTile>
                    {t("Budget")} · {data.monthName}
                  </span>
                  {data.budgetFocus ? (
                    <BudgetFocus focus={data.budgetFocus} currency={currency} daysLeft={data.daysLeftInMonth} />
                  ) : (
                    <>
                      <span className="text-title font-semibold text-ink">{t("No budget yet")}</span>
                      <span className="text-small text-ink-muted">{t("Set a monthly limit and Smartly warns you at 70%.")}</span>
                    </>
                  )}
                </Link>
              </Card>
            </div>
          </section>

          {loansOn && data.loans && (
            <section aria-labelledby="h-loans" className="flex flex-col gap-4">
              <SectionHeader
                id="h-loans"
                eyebrow={t("Loans")}
                tone="loans"
                title={t("Dena-pawna")}
                aside={
                  <>
                    <Link href="/loan-management/dashboard" className="text-body font-semibold text-emerald hover:text-emerald-hover">
                      {t("Open loans")}
                    </Link>
                    <Button variant="action" size="lg" asChild className="hidden sm:inline-flex">
                      <Link href="/loan-management/transactions">{t("Record a payment")}</Link>
                    </Button>
                  </>
                }
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                <KpiTile icon={<ArrowDownLeft />} tone="income" label={`${t("Owed to you")} · ${t("pawna")}`} value={<AmountText value={Number(data.loans.totalPawna)} currency={currency} size="lg" signed tone="income" />}>
                  {t("From")} {data.loanCounts.oweYou} {t(data.loanCounts.oweYou === 1 ? "person" : "people")}
                </KpiTile>
                <KpiTile icon={<ArrowUpRight />} tone="expense" label={`${t("You owe")} · ${t("dena")}`} value={<AmountText value={-Number(data.loans.totalDena)} currency={currency} size="lg" signed tone="expense" />}>
                  {t("To")} {data.loanCounts.youOwe} {t(data.loanCounts.youOwe === 1 ? "person" : "people")}
                </KpiTile>
                <KpiTile icon={<CreditCard />} tone="loans" label={t("Net position")} value={<AmountText value={Number(data.loans.netBalance)} currency={currency} size="lg" signed />}>
                  {Number(data.loans.netBalance) < 0 ? t("You owe more than you are owed") : Number(data.loans.netBalance) > 0 ? t("You are owed more than you owe") : t("All settled")}
                </KpiTile>
                <KpiTile icon={<CircleCheckBig />} tone="warning" label={t("Active loans")} value={<span className="text-amount-lg text-ink tabular-nums">{data.loans.activeAccounts}</span>}>
                  {t("People and banks with a balance")}
                </KpiTile>
              </div>
            </section>
          )}

          <section aria-labelledby="h-habits" className="flex flex-col gap-4">
            <SectionHeader
              id="h-habits"
              eyebrow={t("Habits")}
              tone="habits"
              title={t("Today")}
              aside={
                <Link href="/habit-tracker" className="flex items-center gap-1 text-body font-semibold text-emerald hover:text-emerald-hover">
                  {t("Open habits")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              }
            />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
              <Card className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-h3 text-ink">{t("Today's prayers")}</h3>
                    <span className="text-small text-ink-muted">{data.namaz ? `${prayersDone.length} ${t("of")} ${prayerItems.length} ${t("ticked today")}` : t("No month tracked yet")}</span>
                  </div>
                  {data.namaz && (
                    <Chip tone="habits" className="font-semibold">
                      {prayersDone.length} {t("of")} {prayerItems.length}
                    </Chip>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {prayerItems.map((prayer) => {
                    const done = prayersDone.includes(prayer);
                    return (
                      <Link
                        key={prayer}
                        href={data.namaz ? `/habit-tracker/habits/namaz/${data.namaz.id}` : "/habit-tracker/habits?category=Namaz"}
                        className={cn("flex flex-col items-center gap-2 rounded-md border px-1 py-3", done ? "border-transparent bg-mint-50" : "border-transparent bg-cream")}
                      >
                        <span className={cn("flex size-8 items-center justify-center rounded-full text-white", done ? "bg-emerald" : "border-[1.5px] border-dashed border-line-strong bg-surface")}>
                          {done && <CircleCheckBig className="size-4" strokeWidth={2.5} aria-hidden="true" />}
                        </span>
                        <span className="text-small font-semibold text-ink">{t(prayer)}</span>
                        <span className={cn("text-caption", done ? "text-brand-ink" : "font-normal text-ink-muted")}>{done ? t("Done") : t("Not yet")}</span>
                      </Link>
                    );
                  })}
                </div>
              </Card>
              <HomeTodoCard />
              <Card className="flex flex-col gap-4">
                <h3 className="text-h3 text-ink">{t("Streaks")}</h3>
                <StreakRow icon={<CircleCheckBig />} title={`${t("Daily habits")} · ${data.dailyChallenges}`} text={data.dailyChallenges > 0 ? t("challenges running") : t("Start a daily habit")} href="/habit-tracker/habits?category=Others" />
                <StreakRow
                  icon={<BookOpen />}
                  title={data.reading ? `${t("Reading")} · ${data.reading.title}` : `${t("Reading")} · ${data.readingCount}`}
                  text={data.reading ? `${t("page")} ${data.reading.pagesRead} ${t("of")} ${data.reading.totalPages}` : t("Nothing on the go")}
                  href="/habit-tracker/habits?category=Book"
                />
                <StreakRow
                  icon={<GraduationCap />}
                  title={`${t("Skills")} · ${data.skills?.streak ?? 0} ${t((data.skills?.streak ?? 0) === 1 ? "day" : "days")}`}
                  text={data.skills?.practisedToday ? t("Practised today") : t("Practice again today to keep it")}
                  href="/habit-tracker/habits?category=Course"
                />
              </Card>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="h-vault" className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Eyebrow tone="vault">{t("Security")}</Eyebrow>
                <h2 id="h-vault" className="text-h3 text-ink md:text-h2">
                  {t("Password vault")}
                </h2>
              </div>
              <Card className="flex flex-1 flex-wrap items-center gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
                  <Lock className="size-6.5" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <b className="text-title font-bold text-ink">{data.vault?.hasVaultPassword ? t("Locked") : t("Not set up yet")}</b>
                  <span className="text-small text-ink-muted">{data.vault?.hasVaultPassword ? t("Your logins are behind the vault password.") : t("Keep every login behind its own vault password.")}</span>
                </span>
                <Button variant="action" size="lg" asChild>
                  <Link href="/password-manager">{data.vault?.hasVaultPassword ? t("Unlock vault") : t("Set up the vault")}</Link>
                </Button>
              </Card>
            </section>
            <section aria-labelledby="h-ins" className="flex flex-col gap-4">
              <SectionHeader
                id="h-ins"
                eyebrow={t("Insights")}
                tone="insights"
                title={t("What your numbers say")}
                aside={
                  <Link href="/reports/overview" className="text-body font-semibold text-emerald hover:text-emerald-hover">
                    {t("Open insights")}
                  </Link>
                }
              />
              <Card padding="none" className="flex flex-1 flex-col">
                {data.topIncome || data.topExpense ? (
                  <>
                    {data.topIncome && (
                      <InsightRow icon={<TrendingUp />} tone="insights" title={`${data.topIncome.name} ${t("is")} ${data.topIncome.percent}% ${t("of your income this month.")}`} text={t("Your biggest source of money in.")} />
                    )}
                    {data.topExpense && (
                      <InsightRow
                        icon={<Utensils />}
                        tone="loans"
                        title={`${data.topExpense.name} ${t("is your biggest spend")}: ${data.topExpense.percent}%.`}
                        text={`${formatCurrency(data.topExpense.amount, currency)} ${t("this month")}, ${formatSignedCurrency(-Math.abs(data.topExpense.delta), currency).replace(/^[−+] /, "")} ${t(data.topExpense.delta <= 0 ? "less than" : "more than")} ${data.lastMonthName}.`}
                        divided={Boolean(data.topIncome)}
                      />
                    )}
                  </>
                ) : (
                  <p className="p-5 text-body text-ink-muted">{t("After a few transactions, Smartly explains them here.")}</p>
                )}
              </Card>
            </section>
          </div>
        </>
      )}

      <AddTransactionModal open={modal === "add"} onClose={() => setModal(null)} businessId={data.businessId} currency={currency} />
      <TransferModal open={modal === "transfer"} onClose={() => setModal(null)} businessId={data.businessId} />
    </PageFrame>
  );
}

function BudgetFocus({ focus, currency, daysLeft }: { focus: HomeData["budgetFocus"] & object; currency: string; daysLeft: number }) {
  const { t } = useLocale();
  const limit = Number(focus.monthlyLimit ?? 0);
  const spent = Number(focus.spent);
  const left = limit - spent;
  return (
    <>
      <span className="flex items-baseline justify-between gap-2">
        <b className="flex items-center gap-2 text-title font-semibold text-ink">
          {createElement(budgetCategoryIcon(focus.icon ?? ""), { className: "size-4 text-ink-muted", "aria-hidden": true })}
          {focus.name}
        </b>
        <span className="text-small text-ink-muted tabular-nums">
          <b className="text-ink">{formatCurrency(spent, currency)}</b> {t("of")} {formatCurrency(limit, currency)}
        </span>
      </span>
      <ProgressBar value={focus.percent} tone="budget" label={focus.name} />
      <span className={cn("text-small", focus.percent > 90 ? "font-semibold text-expense" : focus.percent >= 70 ? "font-semibold text-warning" : "text-ink-muted")}>
        {Math.round(focus.percent)}% {t("used")} · {left >= 0 ? `${formatCurrency(left, currency)} ${t("left for")} ${daysLeft} ${t("days")}` : `${formatCurrency(-left, currency)} ${t("over")}`}
      </span>
    </>
  );
}

function StreakRow({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3">
      <IconTile tone="habits">{icon}</IconTile>
      <span className="flex min-w-0 flex-col">
        <b className="truncate text-body font-bold text-ink">{title}</b>
        <span className="text-small text-ink-muted">{text}</span>
      </span>
    </Link>
  );
}

function InsightRow({ icon, tone, title, text, divided = false }: { icon: React.ReactNode; tone: "insights" | "loans"; title: string; text: string; divided?: boolean }) {
  return (
    <div className={cn("flex items-start gap-4 px-5 py-4", divided && "border-t border-line")}>
      <IconTile tone={tone}>{icon}</IconTile>
      <span className="flex flex-col gap-0.5">
        <b className="text-title font-semibold text-ink">{title}</b>
        <span className="text-small text-ink-muted">{text}</span>
      </span>
    </div>
  );
}
