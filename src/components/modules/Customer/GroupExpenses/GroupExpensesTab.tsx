"use client";

import { Lock, Pencil, Plus, Printer, Receipt, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import type { GroupExpense } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { countLabel, dayLabel, isDayClosed, shortName, splitText } from "@/lib/customer/groupDisplay";
import { accountantsOf } from "@/lib/customer/groupFamily";
import { monthName } from "@/lib/customer/insights";
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CategoryIcon, CategoryTile, categoryChipClass, Figure, groupLine } from "./GroupBits";
import { GroupStatement, type StatementSpec } from "./GroupStatement";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupExpensesTabProps {
  data: GroupPageData;
  view: GroupView;
  onAdd: () => void;
  onEdit: (row: GroupExpense) => void;
  onRemove: (row: GroupExpense) => void;
  // A paused group takes no new entries.
  canAdd: boolean;
}

// Date, what for, category, paid by, how shared, amount, edit and delete.
const COLUMNS = "md:grid-cols-[60px_minmax(0,1fr)_132px_minmax(0,190px)_minmax(0,130px)_104px_76px]";

type Sort = "new" | "old" | "high" | "low";
const PAGE = 25;

const SPLIT_WORDS = { EQUAL: "Equally", SHARES: "By shares", MEALS: "By meals", EXACT: "Exact amounts" } as const;

// Money out (the v7 FamilyExpenses board): every cost in the period with
// who paid it -- an accountant from the cash they hold, or someone from
// their own pocket -- found by a search or a category, with a printable
// statement.
export function GroupExpensesTab({ data, view, onAdd, onEdit, onRemove, canAdd }: GroupExpensesTabProps) {
  const { t, fmt } = useLocale();
  const { currency } = data;
  // The month picked in the header.
  const expenses = data.expenses;
  const [query, setQuery] = useState("");
  // A category the dashboard opened this page with (?category=).
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "");
  const [from, setFrom] = useState<"" | "FUND" | "MEMBER">("");
  const [sort, setSort] = useState<Sort>("new");
  const [limit, setLimit] = useState(PAGE);
  const [printing, setPrinting] = useState(false);
  const label = monthName(data.range.key, fmt, "long", true);
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const words = query.trim().toLowerCase();
  const rows = [...expenses]
    .filter((e) => !category || e.category === category)
    .filter((e) => !from || e.paidFrom === from)
    .filter((e) => !words || [e.description ?? "", e.category, e.paidByMember?.name ?? "", String(Number(e.amount))].some((text) => text.toLowerCase().includes(words)))
    .sort((a, b) => (sort === "high" ? Number(b.amount) - Number(a.amount) : sort === "low" ? Number(a.amount) - Number(b.amount) : 0) || (sort === "old" ? a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) : b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)));
  const shown = rows.slice(0, limit);
  const total = rows.reduce((sum, e) => sum + Number(e.amount), 0);
  // The strip: the period's spending, from the group cash or own pockets, and
  // the month's budget (budgets are by month, so only on a month).
  const spent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const fromPocket = expenses.filter((e) => e.paidFrom === "MEMBER").reduce((sum, e) => sum + Number(e.amount), 0);
  const fromCash = spent - fromPocket;
  const budget = view.budget;
  // The chosen one too, so the select still names it in a period without it.
  const categoryNames = [...new Set([...data.categories.filter((c) => !c.hidden).map((c) => c.name), ...expenses.map((e) => e.category), ...(category ? [category] : [])])];
  const accountants = accountantsOf(data.members);

  // Who paid an expense: the accountant from their cash, or a member from their pocket.
  const payerOf = (row: GroupExpense) => (row.paidByMemberId ? view.memberById[row.paidByMemberId] : undefined);
  const payerText = (row: GroupExpense) => {
    const payer = payerOf(row);
    if (row.paidFrom === "MEMBER") return payer ? t("{name}'s pocket", { name: payer.name }) : t("Own pocket");
    return payer?.name ?? t("Group fund");
  };
  const sharedText = (row: GroupExpense) => {
    const shared = splitText(row, data.members);
    if (shared.only) return t("Only {name}", { name: shared.only });
    if (shared.kind === "EQUAL" && !row.splits.length) return null;
    return `${t(SPLIT_WORDS[shared.kind])}${shared.kind === "EQUAL" && shared.detail ? ` · ${toLocaleDigits(shared.detail, fmt)}` : ""}`;
  };

  const statement = (): StatementSpec => {
    const byCategory = [...new Set(rows.map((row) => row.category))]
      .map((name) => {
        const theirs = rows.filter((row) => row.category === name);
        const amount = theirs.reduce((sum, row) => sum + Number(row.amount), 0);
        return { name, count: theirs.length, amount };
      })
      .sort((a, b) => b.amount - a.amount);
    const bySpender = [...new Set(rows.map(payerText))].map((name) => ({ name, amount: rows.filter((row) => payerText(row) === name).reduce((sum, row) => sum + Number(row.amount), 0) }));
    return {
      title: t("Expense statement"),
      sub: `${label} · ${category || t("All categories")}`,
      group: groupLine(t, data.name, data.settings.kind),
      generated: t("Generated {date}", { date: formatDay(data.today, "d MMM yyyy", fmt) }),
      meta: [
        { label: t("Period"), value: label },
        { label: t("Category"), value: category || t("All categories") },
        { label: t("Entries"), value: formatCount(rows.length, fmt) },
        { label: t("Total spent"), value: money(total) },
      ],
      blocks: rows.length
        ? [
            { title: t("By category"), items: byCategory.map((row) => ({ label: row.name, detail: `· ${formatCount(row.count, fmt)} · ${formatCount(Math.round(total > 0 ? (row.amount / total) * 100 : 0), fmt)}%`, value: money(row.amount) })) },
            { items: bySpender.map((row) => ({ label: t("Spent by {name}:", { name: row.name }), value: money(row.amount) })) },
          ]
        : [],
      columns: [{ label: "#" }, { label: t("Date") }, { label: t("Category") }, { label: t("Paid by") }, { label: t("Description") }, { label: t("Amount"), end: true }],
      rows: rows.map((row, i) => [formatCount(i + 1, fmt), formatDay(row.date.slice(0, 10), "d MMM yyyy", fmt), row.category, payerText(row), row.description ?? "—", money(row.amount)]),
      tail: rows.length ? ["", t("Total"), "", "", "", money(total)] : undefined,
      empty: t("No expenses in this period."),
      footer: accountants.length ? t("{name} · expenses paid by the accountants", { name: data.name }) : data.name,
    };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="text-[19px] font-semibold text-ink">{t("Expenses · {period}", { period: label })}</h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" onClick={() => setPrinting(true)}>
            <Printer aria-hidden="true" />
            {t("Print")}
          </Button>
          {canAdd && (
            <Button onClick={onAdd}>
              <Plus aria-hidden="true" />
              {t("Add expense")}
            </Button>
          )}
        </div>
      </div>

      <Card padding="none" className="grid grid-cols-2 gap-x-5 gap-y-4 px-5 py-4 lg:grid-cols-4 lg:gap-y-0 max-lg:[&>*:nth-child(2)]:border-r-0">
        <Figure label={t("Spent in {period}", { period: label })} value={money(spent)} sub={countLabel(t, fmt, expenses.length, "{count} expense", "{count} expenses")} />
        <Figure label={t("Paid from group cash")} value={money(fromCash)} tone="text-emerald" sub={t("Out of the money members gave")} />
        <Figure label={t("Paid from own pocket")} value={money(fromPocket)} tone="text-warning" sub={t("Counts as their contribution")} />
        <Figure
          label={t("Budget left")}
          value={budget ? (budget.left >= 0 ? money(budget.left) : `− ${money(-budget.left)}`) : "—"}
          tone={budget ? (budget.left < 0 ? "text-expense" : "text-income") : "text-ink-muted"}
          sub={budget ? t("{percent}% of {amount} used", { percent: formatCount(budget.percent, fmt), amount: money(budget.budget) }) : t("No budget set for this month")}
          divided={false}
        />
      </Card>

      <ListCard
        label={t("Expenses list")}
        header={
          <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 md:px-5">
            <Input
              type="search"
              size="sm"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLimit(PAGE);
              }}
              placeholder={t("Search what, who or amount…")}
              aria-label={t("Search expenses")}
              leading={<Search className="ml-2.5 size-4 text-ink-muted" aria-hidden="true" />}
              frameClassName="w-full sm:w-60"
            />
            <NativeSelect size="sm" aria-label={t("Category")} value={category} onChange={(event) => { setCategory(event.target.value); setLimit(PAGE); }} className="font-medium">
              <option value="">{t("All categories")}</option>
              {categoryNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect size="sm" aria-label={t("Paid from")} value={from} onChange={(event) => { setFrom(event.target.value as typeof from); setLimit(PAGE); }} className="font-medium">
              <option value="">{t("Paid from: all")}</option>
              <option value="FUND">{t("Group cash")}</option>
              <option value="MEMBER">{t("Own pocket")}</option>
            </NativeSelect>
            <NativeSelect size="sm" aria-label={t("Sort")} value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="font-medium">
              <option value="new">{t("Newest first")}</option>
              <option value="old">{t("Oldest first")}</option>
              <option value="high">{t("Amount: high to low")}</option>
              <option value="low">{t("Amount: low to high")}</option>
            </NativeSelect>
            <span className="ml-auto flex flex-col items-end leading-tight">
              <span className="text-caption text-ink-muted">{t("Total · {count}", { count: countLabel(t, fmt, rows.length, "{count} expense", "{count} expenses") })}</span>
              <span className="text-[18px] font-bold text-expense tabular-nums">{money(total)}</span>
            </span>
          </div>
        }
        footer={
          rows.length > 0 ? (
            <ListFooter className="flex-row items-center gap-3 bg-hover text-[13px] md:px-5">
              <span className="text-ink-muted">{t("Showing {from} to {to} of {count} · click a row for details", { from: formatCount(1, fmt), to: formatCount(shown.length, fmt), count: formatCount(rows.length, fmt) })}</span>
              {(rows.length > shown.length || limit > PAGE) && (
              <Button variant="secondary" size="sm" onClick={() => setLimit(rows.length > shown.length ? limit + PAGE : PAGE)} className="ml-auto h-8.5 pointer-coarse:h-11">
                {rows.length > shown.length ? countLabel(t, fmt, Math.min(PAGE, rows.length - shown.length), "Show {count} older entry", "Show {count} older entries") : t("Show fewer")}
              </Button>
              )}
            </ListFooter>
          ) : null
        }
      >
        <ListHead columns={COLUMNS} className="gap-x-3 border-t md:px-5">
          <ListHeadCell>{t("Date")}</ListHeadCell>
          <ListHeadCell>{t("What for")}</ListHeadCell>
          <ListHeadCell>{t("Category")}</ListHeadCell>
          <ListHeadCell>{t("Paid by")}</ListHeadCell>
          <ListHeadCell>{t("How shared")}</ListHeadCell>
          <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
          <ListHeadCell align="end">{t("Actions")}</ListHeadCell>
        </ListHead>
        {shown.length === 0 &&
          (expenses.length === 0 ? (
            <ListEmpty
              icon={<Receipt />}
              tone="neutral"
              title={t("No expenses in this period.")}
              action={
                canAdd && (
                  <Button size="sm" onClick={onAdd}>
                    {t("Add the first expense")}
                  </Button>
                )
              }
            />
          ) : (
            <ListEmpty title={t("No expenses match your search or filters.")} />
          ))}
        {shown.map((row) => {
          const payer = payerOf(row);
          const pocket = row.paidFrom === "MEMBER";
          const closed = isDayClosed(data.history, row.date.slice(0, 10));
          return (
            <ListRow key={row.id} columns={COLUMNS} className="min-h-12.5 grid-cols-[minmax(0,1fr)_auto_76px] gap-x-3 tabular-nums md:px-5 md:py-1">
              <ListCell className="hidden text-ink-2 md:block">{formatDay(row.date.slice(0, 10), "d MMM", fmt)}</ListCell>
              <ListCell className="flex min-w-0 items-center gap-2 md:block">
                <span className="md:hidden">
                  <CategoryTile name={row.category} categories={data.categories} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-ink">{row.description || row.category}</span>
                  <span className="truncate text-caption font-normal text-ink-muted md:hidden">{[dayLabel(row.date, fmt), row.category, payerText(row)].filter(Boolean).join(" · ")}</span>
                </span>
              </ListCell>
              <ListCell className="hidden md:block">
                <span className={cn("inline-flex h-6 max-w-full items-center gap-1 truncate rounded-full px-2 text-caption font-semibold [&_svg]:size-3 [&_svg]:shrink-0", categoryChipClass(row.category, data.categories))}>
                  <CategoryIcon name={row.category} categories={data.categories} />
                  {row.category}
                </span>
              </ListCell>
              <ListCell className="hidden min-w-0 items-center gap-1.5 text-small md:flex">
                <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", pocket ? "bg-warning-fill" : "bg-emerald")} />
                <span className="truncate text-ink-2">{pocket ? t("Own pocket") : t("Group cash")}</span>
                {payer && (
                  <>
                    <span aria-hidden="true" className="text-ink-faint">·</span>
                    <span className="truncate font-semibold text-ink">{shortName(payer.name)}</span>
                  </>
                )}
              </ListCell>
              <ListCell className="hidden truncate text-small text-ink-2 md:block">{sharedText(row) ?? t("Equally")}</ListCell>
              <ListCell align="end" className="font-semibold text-ink">
                {money(row.amount)}
              </ListCell>
              <ListRowActions className="flex justify-end gap-1.5">
                <button type="button" onClick={() => onEdit(row)} aria-label={closed ? t("Edit expense (closed month)") : t("Edit expense")} title={closed ? t("In a closed month") : undefined} className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                  {closed ? <Lock className="size-3.75" aria-hidden="true" /> : <Pencil className="size-3.75" aria-hidden="true" />}
                </button>
                <button type="button" onClick={() => onRemove(row)} aria-label={t("Delete expense")} className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-expense-soft hover:text-expense pointer-coarse:size-11">
                  <Trash2 className="size-3.75" aria-hidden="true" />
                </button>
              </ListRowActions>
            </ListRow>
          );
        })}
      </ListCard>

      <GroupStatement open={printing} onClose={() => setPrinting(false)} spec={printing ? statement() : null} />
    </div>
  );
}
