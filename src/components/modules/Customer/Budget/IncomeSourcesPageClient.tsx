"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createElement, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow, ListRowActions, ListRowButton, ListRowLink } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import ProgressBar from "@/components/smartly/ProgressBar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { BudgetCategorySummary, BudgetOverview } from "@/lib/customer/api";
import { deleteBudgetCategoryAction } from "@/lib/customer/budgetActions";
import { categoryIconFor } from "@/lib/customer/budgetCategoryVisuals";
import { categoryTone } from "@/lib/customer/categoryTone";
import { formatCurrency } from "@/lib/customer/currency";
import { categoryTransactionsHref } from "@/lib/customer/transactionRows";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { fastestGrowing, outsideCategories } from "./budgetFigures";
import { CategoryDrawer } from "./CategoryDrawer";
import { MonthSwitcher, monthLabel } from "./MonthSwitcher";
import { useRowMenus } from "./useRowMenus";

interface IncomeSourcesPageClientProps {
  businessId: string;
  overview: BudgetOverview;
  // Earned per source the month before the one on show, and in its year
  // so far, by name.
  lastMonth: Record<string, number>;
  thisYear: Record<string, number>;
  // Every income of the month, with a source or not; null on an older
  // backend, when the sources' own sums stand in.
  monthTotal: number | null;
  currency: string;
  canManage: boolean;
  // Opened straight into Add income source (from the New transaction drawer).
  openAdd: boolean;
  // This month in the platform timezone, so a past month isn't called "this month".
  today: { year: number; month: number };
}

const COLUMNS = "md:grid-cols-[minmax(0,1.4fr)_140px_minmax(0,1.4fr)_110px_48px]";
const LIST_ID = "income-sources";
const MENU_TRIGGER = "flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11";
const MENU_ITEM = "cursor-pointer rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken";

// Income sources: where the money comes from -- the month's total, the
// biggest source and the one growing fastest, then a row per source with
// the month, its share of the month, and its year so far.
export function IncomeSourcesPageClient({ businessId, overview, lastMonth, thisYear, monthTotal, currency, canManage, openAdd, today }: IncomeSourcesPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const rowMenu = useRowMenus();
  // Asked from a link (?addType=INCOME, the New transaction drawer's): Add
  // income source opens, also when this page is already open, as a new
  // query keeps the page's state. Read off the address, not the server's
  // prop alone, which stays true once the ask is taken off below.
  const asked = openAdd && searchParams.get("addType") === "INCOME";
  const [drawer, setDrawer] = useState<"closed" | "create" | BudgetCategorySummary>(asked ? "create" : "closed");
  const [seenAsk, setSeenAsk] = useState(asked);
  if (asked !== seenAsk) {
    setSeenAsk(asked);
    if (asked) setDrawer("create");
  }
  const [, startDelete] = useTransition();
  const [switching, startSwitch] = useTransition();

  // The ask comes off the address once seen, so a refresh or the next month
  // doesn't open the drawer again, and the next link is a new ask.
  useEffect(() => {
    if (!asked) return;
    const next = new URLSearchParams(window.location.search);
    if (!next.has("addType")) return;
    next.delete("addType");
    const query = next.toString();
    window.history.replaceState(null, "", query ? `/income-category?${query}` : "/income-category");
  }, [asked]);

  const { month, year } = overview;
  const isCurrentMonth = year === today.year && month === today.month;
  const monthName = monthLabel(month, year, locale);
  const previousName = month === 1 ? monthLabel(12, year - 1, locale) : monthLabel(month - 1, year, locale);
  const yearText = toLocaleDigits(String(year), locale);
  const sources = overview.categories;
  const categorized = sources.reduce((sum, s) => sum + Number(s.spent), 0);
  // The month's real income; the sources' sums leave some out.
  const total = monthTotal ?? categorized;
  const outside = outsideCategories(monthTotal, categorized);
  const earning = sources.filter((s) => Number(s.spent) > 0).length;
  const biggest = [...sources].sort((a, b) => Number(b.spent) - Number(a.spent))[0];
  const shareOf = (amount: number) => (total > 0 ? Math.round((amount / total) * 100) : 0);
  // The biggest source, once it brought something in: the month's total
  // can be above 0 while every source earned 0 (an asset sale, a referral
  // payout, an income saved without a source).
  const top = biggest && Number(biggest.spent) > 0 && total > 0 ? biggest : undefined;
  const biggestShare = top ? shareOf(Number(top.spent)) : 0;
  const growth = fastestGrowing(
    sources.map((s) => ({ name: s.name, amount: Number(s.spent) })),
    lastMonth,
  );
  const hadLastMonth = Object.values(lastMonth).some((amount) => amount > 0);
  const money = (value: number | string) => formatCurrency(value, currency);
  const percent = (value: number) => formatCount(value, locale);

  function goToMonth(nextMonth: number, nextYear: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("month", String(nextMonth));
    next.set("year", String(nextYear));
    next.delete("addType");
    startSwitch(() => router.push(`/income-category?${next.toString()}`));
  }

  async function remove(source: BudgetCategorySummary) {
    if (!(await confirm({ title: t("Delete {name}?", { name: source.name }), message: t("Past transactions keep their category; only the source goes."), confirmLabel: "Delete source" }))) return;
    startDelete(async () => {
      const result = await deleteBudgetCategoryAction(businessId, source.id);
      if (result.success) {
        toast.success(t("Source deleted"));
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to delete category"));
      }
    });
  }

  // A source's actions: all three for an owner or accountant; a viewer
  // still gets to its month's transactions (the row is that link).
  const menu = (source: BudgetCategorySummary) => (
    <DropdownMenuContent align="end" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
      <DropdownMenuItem onSelect={() => setDrawer(source)} className={MENU_ITEM}>
        {t("Edit")}
      </DropdownMenuItem>
      <DropdownMenuItem asChild className={MENU_ITEM}>
        <Link href={categoryTransactionsHref("INCOME", source.name, year, month)}>{t("See transactions")}</Link>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => remove(source)} className="cursor-pointer rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
        {t("Delete")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const addButton = (
    <Button onClick={() => setDrawer("create")}>
      <Plus strokeWidth={2.25} />
      {t("Add income source")}
    </Button>
  );

  return (
    <PageFrame>
      <PageHeader
        eyebrow={t("Money")}
        title={t("Income sources")}
        description={t("Where your money comes from, and how much came from each one this month.")}
        looseDescription
        actions={
          <>
            <MonthSwitcher month={month} year={year} onChange={goToMonth} />
            {canManage && addButton}
          </>
        }
      />

      <div aria-busy={switching || undefined} className={cn("flex flex-col gap-4 transition-opacity", switching && "opacity-60")}>
        <section aria-label={monthName} className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="flex flex-col gap-3">
            <span className="text-small font-medium text-ink-muted">{t("Money in · {month}", { month: monthName })}</span>
            <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <AmountText value={total} currency={currency} size="lg" tone="income" signed />
              <span className="text-small text-ink-muted">{t(earning === 1 ? "from {count} source" : "from {count} sources", { count: formatCount(earning, locale) })}</span>
            </span>
            {/* The biggest source's part of the month. */}
            <ProgressBar value={biggestShare} tone="income" label={top ? t("{name}, {percent}% of the month", { name: top.name, percent: percent(biggestShare) }) : t("Money in")} />
            {/* Money that came in under no source is said by the line below. */}
            {top ? (
              <span className="text-small text-ink-muted">{t("{name} brought {percent}% of it", { name: top.name, percent: percent(biggestShare) })}</span>
            ) : (
              total <= 0 && <span className="text-small text-ink-muted">{isCurrentMonth ? t("Nothing came in yet this month") : t("Nothing came in during {month}", { month: monthName })}</span>
            )}
            {outside > 0 && <span className="text-caption text-ink-muted">{t("{amount} came in without a source", { amount: money(outside) })}</span>}
          </Card>
          <Card className="flex flex-col gap-2">
            <span className="text-small font-medium text-ink-muted">{t("Biggest source")}</span>
            <b className="text-h2 text-ink">{top ? `${top.name} · ${percent(biggestShare)}%` : "—"}</b>
            <span className="text-small text-ink-muted">
              {top
                ? isCurrentMonth
                  ? t("{amount} this month", { amount: money(top.spent) })
                  : t("{amount} in {month}", { amount: money(top.spent), month: monthName })
                : total > 0
                  ? t("Add an income under a source to see it")
                  : t("Add an income to see it")}
            </span>
          </Card>
          <Card className="flex flex-col gap-2">
            <span className="text-small font-medium text-ink-muted">{t("Growing fastest")}</span>
            <b className="text-h2 text-ink">{growth ? `${growth.name} · ↑ ${percent(growth.percent)}%` : "—"}</b>
            <span className="text-small text-ink-muted">
              {growth
                ? isCurrentMonth
                  ? t("{before} last month, {now} now", { before: money(growth.before), now: money(growth.now) })
                  : t("{before} in {previous}, {now} in {month}", { before: money(growth.before), previous: previousName, now: money(growth.now), month: monthName })
                : hadLastMonth
                  ? t(isCurrentMonth ? "No source grew since last month" : "No source grew from the month before")
                  : t("Needs last month to compare with")}
            </span>
          </Card>
        </section>

        <ListCard
          id={LIST_ID}
          label={t("Your sources")}
          busy={switching}
          header={
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 md:px-6">
              <h2 className="text-h3 text-ink">{t("Your sources")}</h2>
              <Link href="/reports/overview" className="text-body font-semibold text-emerald hover:text-emerald-hover">
                {t("See insights")}
              </Link>
            </div>
          }
        >
          {sources.length === 0 ? (
            <ListEmpty icon={<Plus />} title={t("No income source yet")} description={t("Salary, freelance, shop sales… name each one and every income lands under it.")} action={canManage && addButton} />
          ) : (
            <>
              <ListHead columns={COLUMNS}>
                <ListHeadCell>{t("Source")}</ListHeadCell>
                <ListHeadCell align="end">{isCurrentMonth ? t("This month") : monthName}</ListHeadCell>
                <ListHeadCell>{t("Share of the month")}</ListHeadCell>
                <ListHeadCell align="end">{isCurrentMonth ? t("This year") : year < today.year ? yearText : t("{year} so far", { year: yearText })}</ListHeadCell>
                <ListHeadCell>
                  <span className="sr-only">{t("Actions")}</span>
                </ListHeadCell>
              </ListHead>
              {sources.map((source) => {
                const amount = Number(source.spent);
                const share = shareOf(amount);
                const visual = categoryTone(source.color);
                const seeHref = categoryTransactionsHref("INCOME", source.name, year, month);
                const shareText = t("{percent}% of the month", { percent: percent(share) });
                const phoneMenu = rowMenu(source.id);
                return (
                  <ListRow key={source.id} columns={COLUMNS} density="spacious">
                    <ListCell className="flex min-w-0 items-center gap-3">
                      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-5", visual.bg, visual.fg)}>{createElement(categoryIconFor(source), { "aria-hidden": true })}</span>
                      <span className="flex min-w-0 flex-col">
                        {canManage ? (
                          <>
                            {/* A phone has no room for the menu button: a tap on the row opens the menu (a scroll doesn't). */}
                            <DropdownMenu {...phoneMenu.root}>
                              <DropdownMenuTrigger asChild {...phoneMenu.trigger}>
                                <ListRowButton aria-label={t("{name}: actions", { name: source.name })} className="truncate text-body font-semibold text-ink md:hidden">
                                  {source.name}
                                </ListRowButton>
                              </DropdownMenuTrigger>
                              {menu(source)}
                            </DropdownMenu>
                            <ListRowLink href={seeHref} className="hidden truncate text-body font-semibold text-ink md:block">
                              {source.name}
                            </ListRowLink>
                          </>
                        ) : (
                          <ListRowLink href={seeHref} className="truncate text-body font-semibold text-ink">
                            {source.name}
                          </ListRowLink>
                        )}
                        <span className="text-small text-ink-muted md:hidden">{shareText}</span>
                      </span>
                    </ListCell>
                    <ListCell align="end">
                      <AmountText value={amount} currency={currency} size="sm" tone={amount > 0 ? "income" : "inherit"} signed={amount > 0} className={cn("font-bold", amount === 0 && "text-ink-muted")} />
                    </ListCell>
                    <ListCell className="hidden flex-col gap-2 md:flex">
                      {/* The bar in the source's own colour, as its tile. */}
                      <ProgressBar value={share} tone="income" label={t("{name}, {percent}% of the month", { name: source.name, percent: percent(share) })} className={cn("[&>span]:bg-current", visual.fg)} />
                      <span className="text-caption font-normal text-ink-muted">{shareText}</span>
                    </ListCell>
                    <ListCell align="end" className="hidden text-body text-ink-2 tabular-nums md:block">
                      {thisYear[source.name] ? money(thisYear[source.name]) : "—"}
                    </ListCell>
                    {canManage ? (
                      <ListRowActions className="hidden md:flex">
                        <DropdownMenu>
                          <DropdownMenuTrigger aria-label={t("{name}: actions", { name: source.name })} className={MENU_TRIGGER}>
                            <MoreHorizontal className="size-4.5" aria-hidden="true" />
                          </DropdownMenuTrigger>
                          {menu(source)}
                        </DropdownMenu>
                      </ListRowActions>
                    ) : (
                      <ListCell className="hidden md:block" />
                    )}
                  </ListRow>
                );
              })}
            </>
          )}
        </ListCard>
      </div>

      <CategoryDrawer
        open={drawer !== "closed"}
        onClose={() => setDrawer("closed")}
        businessId={businessId}
        type="INCOME"
        editing={drawer === "closed" || drawer === "create" ? null : drawer}
        currency={currency}
        existingNames={sources.map((s) => s.name)}
      />
      {confirmDialog}
    </PageFrame>
  );
}
