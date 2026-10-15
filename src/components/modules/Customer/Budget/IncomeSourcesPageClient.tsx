"use client";

import { MoreVertical, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import ProgressBar from "@/components/smartly/ProgressBar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { BudgetCategorySummary, BudgetOverview } from "@/lib/customer/api";
import { deleteBudgetCategoryAction } from "@/lib/customer/budgetActions";
import { budgetCategoryIcon } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CategoryDrawer } from "./CategoryDrawer";
import { MonthSwitcher, monthLabel } from "./MonthSwitcher";

interface IncomeSourcesPageClientProps {
  businessId: string;
  overview: BudgetOverview;
  // Earned per source last month and this year, by name.
  lastMonth: Record<string, number>;
  thisYear: Record<string, number>;
  currency: string;
  canManage: boolean;
}

// Income sources: where the money comes from -- this month's total, the
// biggest source and the one growing fastest, then a row per source with
// this month, its share of the month, and this year.
export function IncomeSourcesPageClient({ businessId, overview, lastMonth, thisYear, currency, canManage }: IncomeSourcesPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [drawer, setDrawer] = useState<"closed" | "create" | BudgetCategorySummary>("closed");
  const [, startDelete] = useTransition();

  const { month, year } = overview;
  const monthName = monthLabel(month, year, locale).split(" ")[0];
  const sources = overview.categories;
  const total = sources.reduce((sum, s) => sum + Number(s.spent), 0);
  const biggest = [...sources].sort((a, b) => Number(b.spent) - Number(a.spent))[0];
  const growth = sources
    .map((s) => ({ source: s, now: Number(s.spent), before: lastMonth[s.name] ?? 0 }))
    .filter((g) => g.before > 0 && g.now > g.before)
    .map((g) => ({ ...g, percent: Math.round(((g.now - g.before) / g.before) * 100) }))
    .sort((a, b) => b.percent - a.percent)[0];

  function goToMonth(nextMonth: number, nextYear: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", String(nextMonth));
    next.set("year", String(nextYear));
    router.push(`/income-category?${next.toString()}`);
  }

  async function remove(source: BudgetCategorySummary) {
    if (!(await confirm({ title: `${t("Delete")} ${source.name}?`, message: t("Past transactions keep their category; only the source goes."), confirmLabel: "Delete source" }))) return;
    startDelete(async () => {
      const result = await deleteBudgetCategoryAction(businessId, source.id);
      if (result.success) {
        toast.success(t("Category deleted"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to delete category"));
      }
    });
  }

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={t("Money")}
        title={t("Income sources")}
        description={t("Where your money comes from, and how much came from each one this month.")}
        actions={
          <>
            <MonthSwitcher month={month} year={year} onChange={goToMonth} />
            {canManage && (
              <Button size="lg" onClick={() => setDrawer("create")}>
                <Plus strokeWidth={2.25} />
                {t("Add income source")}
              </Button>
            )}
          </>
        }
      />

      <section aria-label={monthName} className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-6">
        <Card className="flex flex-col gap-3">
          <span className="text-small font-medium text-ink-muted">
            {t("Money in")} · {monthName}
          </span>
          <span className="flex items-baseline gap-3">
            <AmountText value={total} currency={currency} size="lg" tone="income" signed />
            <span className="text-small text-ink-muted">
              {t("from")} {sources.filter((s) => Number(s.spent) > 0).length} {t("sources")}
            </span>
          </span>
          <ProgressBar value={100} tone="income" label={t("Money in")} />
          <span className="text-small text-ink-muted">{biggest && total > 0 ? `${biggest.name} ${t("brought")} ${Math.round((Number(biggest.spent) / total) * 100)}% ${t("of it")}` : t("Nothing came in yet this month")}</span>
        </Card>
        <Card className="flex flex-col gap-2">
          <span className="text-small font-medium text-ink-muted">{t("Biggest source")}</span>
          <b className="text-h2 text-ink">{biggest && total > 0 ? `${biggest.name} · ${Math.round((Number(biggest.spent) / total) * 100)}%` : "—"}</b>
          <span className="text-small text-ink-muted">{biggest && total > 0 ? `${formatCurrency(biggest.spent, currency)} ${t("this month")}` : t("Add an income to see it")}</span>
        </Card>
        <Card className="flex flex-col gap-2">
          <span className="text-small font-medium text-ink-muted">{t("Growing fastest")}</span>
          <b className="text-h2 text-ink">{growth ? `${growth.source.name} · ↑ ${growth.percent}%` : "—"}</b>
          <span className="text-small text-ink-muted">{growth ? `${formatCurrency(growth.before, currency)} ${t("last month")}, ${formatCurrency(growth.now, currency)} ${t("now")}` : t("Needs last month to compare with")}</span>
        </Card>
      </section>

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-h3 text-ink">{t("Your sources")}</h2>
          <Link href="/reports/overview" className="text-body font-semibold text-emerald hover:text-emerald-hover">
            {t("See insights")}
          </Link>
        </div>
        {sources.length === 0 ? (
          <EmptyState
            bordered={false}
            icon={<Plus />}
            title={t("No income source yet")}
            description={t("Salary, freelance, shop sales… name each one and every income lands under it.")}
            action={canManage && <Button onClick={() => setDrawer("create")}>{t("Add income source")}</Button>}
            className="border-t border-line"
          />
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1.4fr)_140px_minmax(0,1.4fr)_110px_48px] gap-4 border-t border-line bg-cream px-6 py-3 text-caption font-semibold text-ink-muted md:grid">
              <span>{t("Source")}</span>
              <span className="text-right">{t("This month")}</span>
              <span>{t("Share of the month")}</span>
              <span className="text-right">{t("This year")}</span>
              <span />
            </div>
            {sources.map((source) => {
              const amount = Number(source.spent);
              const share = total > 0 ? Math.round((amount / total) * 100) : 0;
              const visual = categoryTone(source.color);
              return (
                <div key={source.id} className="grid min-h-18 grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-4 py-3 md:grid-cols-[minmax(0,1.4fr)_140px_minmax(0,1.4fr)_110px_48px] md:gap-4 md:px-6 md:py-0">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-5", visual.bg, visual.fg)}>{source.icon && createElement(budgetCategoryIcon(source.icon), { "aria-hidden": true })}</span>
                  <span className="flex min-w-0 flex-col md:col-start-1 md:row-start-1 md:ml-13">
                    <b className="truncate text-body font-semibold text-ink">{source.name}</b>
                    <span className="text-small text-ink-muted md:hidden">
                      {share}% {t("of the month")}
                    </span>
                  </span>
                  <AmountText value={amount} currency={currency} size="sm" tone={amount > 0 ? "income" : "inherit"} signed={amount > 0} className={cn("text-right font-bold", amount === 0 && "text-ink-muted")} />
                  <span className="col-span-3 hidden flex-col gap-2 md:flex">
                    <ProgressBar value={share} tone="income" label={source.name} className="[&>span]:bg-current" />
                    <span className="text-caption font-normal text-ink-muted">
                      {share}% {t("of the month")}
                    </span>
                  </span>
                  <span className="hidden text-right text-body text-ink-2 tabular-nums md:block">{thisYear[source.name] ? formatCurrency(thisYear[source.name], currency) : "—"}</span>
                  {canManage ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label={`${t("More for")} ${source.name}`} className="col-start-3 row-start-1 hidden size-10 items-center justify-center rounded-md text-ink-muted hover:bg-cream data-open:bg-cream md:col-start-5 md:flex">
                        <MoreVertical className="size-4.5" aria-hidden="true" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                        <DropdownMenuItem onSelect={() => setDrawer(source)} className="cursor-pointer rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                          {t("Edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                          <Link href={`/transactions?type=INCOME&categoryId=${encodeURIComponent(source.name)}`}>{t("See transactions")}</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => remove(source)} className="cursor-pointer rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
                          {t("Delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <span className="hidden md:block" />
                  )}
                </div>
              );
            })}
          </>
        )}
      </Card>

      <CategoryDrawer open={drawer !== "closed"} onClose={() => setDrawer("closed")} businessId={businessId} type="INCOME" editing={drawer === "closed" || drawer === "create" ? null : drawer} currency={currency} />
      {confirmDialog}
    </PageFrame>
  );
}
