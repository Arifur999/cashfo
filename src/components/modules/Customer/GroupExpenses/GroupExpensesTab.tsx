"use client";

import { Lock, Pencil, Plus, Printer, Receipt, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import type { GroupExpense } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { countLabel, dayLabel, isDayClosed, shortName, splitText } from "@/lib/customer/groupDisplay";
import { accountantsOf } from "@/lib/customer/groupFamily";
import { type GroupPeriod, periodLabel } from "@/lib/customer/groupPeriod";
import { formatDay } from "@/lib/date";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CategoryTile, groupLine, MemberAvatar } from "./GroupBits";
import { GroupPeriodPicker } from "./GroupPeriodPicker";
import { GroupStatement, type StatementSpec } from "./GroupStatement";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupExpensesTabProps {
  data: GroupPageData;
  view: GroupView;
  onPeriod: (period: GroupPeriod) => void;
  onAdd: () => void;
  onEdit: (row: GroupExpense) => void;
  onRemove: (row: GroupExpense) => void;
  busy: boolean;
  // A paused group takes no new entries.
  canAdd: boolean;
}

const PERIODS = ["today", "week", "month", "year", "custom"] as const;
// #, date, category, who paid, description, amount, edit, delete.
const COLUMNS = "md:grid-cols-[36px_64px_168px_160px_minmax(0,1fr)_110px_76px]";
const PAGE = 25;

const SPLIT_WORDS = { EQUAL: "Equally", SHARES: "By cost split", MEALS: "By meals", EXACT: "Exact amounts" } as const;

// Money out (the v7 FamilyExpenses board): every cost in the period with
// who paid it -- an accountant from the cash they hold, or someone from
// their own pocket -- found by a search or a category, with a printable
// statement.
export function GroupExpensesTab({ data, view, onPeriod, onAdd, onEdit, onRemove, busy, canAdd }: GroupExpensesTabProps) {
  const { t, fmt } = useLocale();
  const { currency, startDay } = data;
  const period = data.period ?? { kind: "month" };
  const expenses = data.periodExpenses ?? data.expenses;
  const [query, setQuery] = useState("");
  // A category the dashboard opened this page with (?category=).
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "");
  const [limit, setLimit] = useState(PAGE);
  const [printing, setPrinting] = useState(false);
  const label = periodLabel(period, data.today, startDay, t, fmt);
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const words = query.trim().toLowerCase();
  const rows = [...expenses]
    .filter((e) => !category || e.category === category)
    .filter((e) => !words || [e.description ?? "", e.category, e.paidByMember?.name ?? ""].some((text) => text.toLowerCase().includes(words)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const shown = rows.slice(0, limit);
  const total = rows.reduce((sum, e) => sum + Number(e.amount), 0);
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
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <GroupPeriodPicker value={period} options={PERIODS} today={data.today} startDay={startDay} onChange={onPeriod} busy={busy} />
        {canAdd && (
          <Button onClick={onAdd}>
            <Plus aria-hidden="true" />
            {t("Add expense")}
          </Button>
        )}
      </div>

      <ListCard
        label={t("Expenses")}
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
              placeholder={t("Search description or category…")}
              aria-label={t("Search expenses")}
              leading={<Search className="ml-2.5 size-4 text-ink-muted" aria-hidden="true" />}
              frameClassName="w-full sm:w-64"
            />
            <NativeSelect
              size="sm"
              aria-label={t("Category")}
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setLimit(PAGE);
              }}
              className="font-medium"
            >
              <option value="">{t("All categories")}</option>
              {categoryNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </NativeSelect>
            <span className="ml-auto flex items-center gap-3">
              <span className="flex flex-col items-end leading-tight">
                <span className="text-caption text-ink-muted">{t("Total spent · {period}", { period: label })}</span>
                <span className="text-[18px] font-bold text-ink tabular-nums">{money(total)}</span>
              </span>
              <Button variant="outline" size="icon" aria-label={t("Print statement")} onClick={() => setPrinting(true)}>
                <Printer aria-hidden="true" />
              </Button>
            </span>
          </div>
        }
        footer={
          rows.length > shown.length || limit > PAGE ? (
            <ListFooter className="flex-row items-center gap-3 bg-strip md:px-5">
              <Button variant="secondary" size="sm" onClick={() => setLimit(rows.length > shown.length ? limit + PAGE : PAGE)} className="h-8.5 pointer-coarse:h-11">
                {rows.length > shown.length ? countLabel(t, fmt, Math.min(PAGE, rows.length - shown.length), "Show {count} older entry", "Show {count} older entries") : t("Show fewer")}
              </Button>
              <span className="ml-auto text-ink-soft">{t("{shown} of {count}", { shown: formatCount(shown.length, fmt), count: formatCount(rows.length, fmt) })}</span>
            </ListFooter>
          ) : null
        }
      >
        <ListHead columns={COLUMNS} className="gap-x-3 border-t md:px-5">
          <ListHeadCell>#</ListHeadCell>
          <ListHeadCell>{t("Date")}</ListHeadCell>
          <ListHeadCell>{t("Category")}</ListHeadCell>
          <ListHeadCell>{accountants.length ? t("Accountant") : t("Paid by")}</ListHeadCell>
          <ListHeadCell>{t("Description")}</ListHeadCell>
          <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
          <ListHeadCell>
            <span className="sr-only">{t("Actions")}</span>
          </ListHeadCell>
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
                    {t("Add expense")}
                  </Button>
                )
              }
            />
          ) : (
            <ListEmpty title={t("No entry matches.")} />
          ))}
        {shown.map((row, index) => {
          const payer = payerOf(row);
          const pocket = row.paidFrom === "MEMBER";
          const shared = sharedText(row);
          const closed = isDayClosed(data.history, row.date.slice(0, 10));
          return (
            <ListRow key={row.id} columns={COLUMNS} className="min-h-12 grid-cols-[minmax(0,1fr)_auto_76px] gap-x-3 tabular-nums md:px-5 md:py-1">
              <ListCell className="hidden text-ink-muted md:block">{formatCount(index + 1, fmt)}</ListCell>
              <ListCell className="hidden text-ink-soft md:block">{formatDay(row.date.slice(0, 10), "d MMM", fmt)}</ListCell>
              <ListCell className="flex items-center gap-2">
                <CategoryTile name={row.category} categories={data.categories} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-ink">{row.category}</span>
                  <span className="truncate text-caption font-normal text-ink-muted md:hidden">{[dayLabel(row.date, fmt), payerText(row), row.description].filter(Boolean).join(" · ")}</span>
                </span>
              </ListCell>
              <ListCell className="hidden items-center gap-1.75 md:flex">
                {payer && <MemberAvatar member={payer} members={data.members} size={24} />}
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate font-medium text-ink">{pocket ? (payer ? shortName(payer.name) : t("Own pocket")) : (payer?.name ?? t("Group fund"))}</span>
                  {pocket && <span className="truncate text-[11.5px] font-semibold text-warning">{t("Own pocket · credited")}</span>}
                </span>
              </ListCell>
              <ListCell className="hidden min-w-0 flex-col md:flex">
                <span className={cn("truncate", row.description ? "text-ink-2" : "text-input")}>{row.description || "—"}</span>
                {shared && <span className="truncate text-[11.5px] text-ink-muted">{shared}</span>}
              </ListCell>
              <ListCell align="end" className="font-semibold text-ink">
                {money(row.amount)}
              </ListCell>
              <ListRowActions className="flex justify-end gap-0.5">
                <button type="button" onClick={() => onEdit(row)} aria-label={closed ? t("Edit expense (closed month)") : t("Edit expense")} title={closed ? t("In a closed month") : undefined} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                  {closed ? <Lock className="size-4" aria-hidden="true" /> : <Pencil className="size-4" aria-hidden="true" />}
                </button>
                <button type="button" onClick={() => onRemove(row)} aria-label={t("Delete expense")} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-expense-soft hover:text-expense pointer-coarse:size-11">
                  <Trash2 className="size-4" aria-hidden="true" />
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
