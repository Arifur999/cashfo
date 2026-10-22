"use client";

import { Calendar, Lock, MoreVertical, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import LoadMore from "@/components/smartly/LoadMore";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { GroupExpense } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { countLabel, dayLabel, rangeLabel, SPLIT_LABELS, splitText } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CategoryTile, Figure } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupExpensesTabProps {
  data: GroupPageData;
  view: GroupView;
  onAdd: () => void;
  onEdit: (row: GroupExpense) => void;
  onRemove: (row: GroupExpense) => void;
}

// Date, category, paid from, amount and the menu; from xl the description
// and how it is shared get columns of their own (below that they sit under
// the category), so the money columns never run past the card.
const COLUMNS = "md:grid-cols-[56px_minmax(0,1fr)_160px_104px_44px] xl:grid-cols-[64px_minmax(0,1fr)_minmax(0,1.2fr)_160px_140px_110px_44px]";
const PAGE = 20;
const LIST_ID = "group-expenses-list";

// Money out: every cost of the month, what it was for, whether it came from
// the group fund or someone's own pocket (credited to them), and how it is
// shared.
export function GroupExpensesTab({ data, view, onAdd, onEdit, onRemove }: GroupExpensesTabProps) {
  const { t, locale } = useLocale();
  const { currency } = data;
  const [category, setCategory] = useState("");
  // "": anyone; "FUND": the group fund; else a member who paid from their pocket.
  const [paidBy, setPaidBy] = useState("");
  const [limit, setLimit] = useState(PAGE);
  // Another month keeps this tab (and its filters) but starts its list from
  // the top: a month that grew to 60 rows would leave the next one's 8 with
  // a "Show fewer".
  const [listMonth, setListMonth] = useState(data.range.key);
  if (listMonth !== data.range.key) {
    setListMonth(data.range.key);
    setLimit(PAGE);
  }
  const total = data.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const pocket = data.expenses.filter((e) => e.paidFrom === "MEMBER" && e.paidByMemberId);
  const pocketTotal = pocket.reduce((sum, e) => sum + Number(e.amount), 0);
  // Who paid from their own pocket, and for what: "Arif ৳ 3,200 (wifi, electricity)".
  const pockets = [...new Set(pocket.map((e) => e.paidByMemberId as string))].map((id) => {
    const theirs = pocket.filter((e) => e.paidByMemberId === id);
    return { id, name: view.memberById[id]?.name ?? "—", amount: theirs.reduce((sum, e) => sum + Number(e.amount), 0), what: [...new Set(theirs.map((e) => e.category.toLowerCase()))].join(", ") };
  });
  const filtered = !!category || !!paidBy;
  const rows = [...data.expenses]
    .filter((e) => (!category || e.category === category) && (!paidBy || (paidBy === "FUND" ? e.paidFrom !== "MEMBER" : e.paidFrom === "MEMBER" && e.paidByMemberId === paidBy)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const shown = rows.slice(0, limit);
  const shownTotal = rows.reduce((sum, e) => sum + Number(e.amount), 0);
  const month = monthName(data.range.key, locale);
  // The chosen one too, so the select still names it in a month without it.
  const categoryNames = [...new Set([...data.categories.map((c) => c.name), ...data.expenses.map((e) => e.category), ...(category ? [category] : [])])];
  const money = (value: number | string) => formatCurrency(value, currency, locale);
  // "All 14 entries add up to ৳ 12,000"; with a filter on, "These 3 entries".
  const sum = rows.length === 1 ? "{count} entry adds up to {amount}" : filtered ? "These {count} entries add up to {amount}" : "All {count} entries add up to {amount}";

  // A new filter starts from the top of its list.
  const filter = (apply: () => void) => {
    apply();
    setLimit(PAGE);
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 md:px-6">
      <NativeSelect size="sm" aria-label={t("Category")} value={category} onChange={(event) => filter(() => setCategory(event.target.value))} className="font-medium">
        <option value="">{t("All categories")}</option>
        {categoryNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect size="sm" aria-label={t("Paid from")} value={paidBy} onChange={(event) => filter(() => setPaidBy(event.target.value))} className="font-medium">
        <option value="">{t("Paid from: anyone")}</option>
        <option value="FUND">{t("Group fund")}</option>
        {data.members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </NativeSelect>
      {/* The month's days, as text: the month is picked in the header. */}
      <span className="flex items-center gap-2 text-small text-ink-muted">
        <Calendar className="size-4" aria-hidden="true" />
        {rangeLabel(data.range, locale)}
      </span>
      <span className="flex-1" />
      <span className="text-small text-ink-muted">{countLabel(t, locale, rows.length, "{count} entry", "{count} entries")}</span>
      <Button size="sm" onClick={onAdd}>
        <Plus strokeWidth={2.25} />
        {t("Add expense")}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card padding="none" className="flex flex-wrap items-center gap-5 px-5 py-3">
        <Figure label={t("Spent in {month}", { month })} value={money(total)} />
        <Figure label={t("From the group fund")} value={money(total - pocketTotal)} />
        <Figure label={t("From own pockets · credited back")} value={money(pocketTotal)} tone={pocketTotal ? "text-emerald" : "text-ink"} divided={false} />
        <span className="flex-1" />
        {pockets.length > 0 && (
          <span className="flex flex-col text-small leading-normal text-ink-2 md:text-right">
            {pockets.map((row) => (
              <span key={row.id}>
                {row.name} {money(row.amount)} ({row.what})
              </span>
            ))}
          </span>
        )}
      </Card>

      <ListCard
        id={LIST_ID}
        label={t("Expenses in {month}", { month })}
        header={toolbar}
        footer={
          rows.length > 0 && (
            <ListFooter>
              <p className="text-ink-2">{fillNodes(t(sum), { count: formatCount(rows.length, locale), amount: <b className="font-semibold text-ink tabular-nums">{money(shownTotal)}</b> })}</p>
              <LoadMore shown={shown.length} total={rows.length} step={PAGE} onMore={() => setLimit(limit + PAGE)} onLess={limit > PAGE ? () => setLimit(PAGE) : undefined} focusTargetId={LIST_ID} />
            </ListFooter>
          )
        }
      >
        <ListHead columns={COLUMNS}>
          <ListHeadCell>{t("Date")}</ListHeadCell>
          <ListHeadCell>{t("Category")}</ListHeadCell>
          <ListHeadCell className="hidden xl:block">{t("Description")}</ListHeadCell>
          <ListHeadCell>{t("Paid from")}</ListHeadCell>
          <ListHeadCell className="hidden xl:block">{t("Shared")}</ListHeadCell>
          <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
          <ListHeadCell>
            <span className="sr-only">{t("Actions")}</span>
          </ListHeadCell>
        </ListHead>
        {shown.length === 0 && <ListEmpty title={data.expenses.length === 0 ? t("No expense this month yet.") : t("No entry matches.")} />}
        {shown.map((row) => {
          const payer = row.paidFrom === "MEMBER" && row.paidByMemberId ? view.memberById[row.paidByMemberId] : null;
          const shared = splitText(row, data.members);
          const sharedText = shared.only ? t("Only {name}", { name: shared.only }) : `${t(SPLIT_LABELS[shared.kind])}${shared.detail ? ` · ${toLocaleDigits(shared.detail, locale)}` : ""}`;
          const day = dayLabel(row.date, locale);
          return (
            <ListRow key={row.id} columns={COLUMNS} className="grid-cols-[minmax(0,1fr)_auto_44px] gap-x-3 tabular-nums md:gap-x-4">
              <ListCell className="hidden text-ink-2 md:block">{day}</ListCell>
              <ListCell className="flex items-center gap-2">
                <CategoryTile name={row.category} categories={data.categories} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-ink">{row.category}</span>
                  {/* What the hidden columns would say: the day and who paid on a phone, the split below xl. */}
                  <span className="truncate text-caption font-normal text-ink-muted md:hidden">{[day, payer && t("{name}'s pocket", { name: payer.name }), row.description].filter(Boolean).join(" · ")}</span>
                  <span className="hidden truncate text-caption font-normal text-ink-muted md:block xl:hidden">{[sharedText, row.description].filter(Boolean).join(" · ")}</span>
                </span>
              </ListCell>
              <ListCell className={cn("hidden truncate xl:block", row.description ? "text-ink-2" : "text-ink-muted")}>{row.description || "—"}</ListCell>
              <ListCell className="hidden items-center gap-2 md:flex">
                {payer ? (
                  <>
                    <PersonAvatar name={payer.name} src={payer.photoUrl} size={22} coloured />
                    <span className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate font-medium text-ink">{payer.name}</span>
                      <span className="truncate text-caption font-semibold text-emerald">{t("credited {amount}", { amount: money(row.amount) })}</span>
                    </span>
                  </>
                ) : (
                  <span className="flex items-center gap-2 text-ink-2">
                    <Wallet className="size-4 text-ink-muted" aria-hidden="true" />
                    {t("Group fund")}
                  </span>
                )}
              </ListCell>
              <ListCell className="hidden xl:block">
                <Chip tone={shared.kind === "EQUAL" && !shared.only ? "neutral" : "mint"} size="sm" className="max-w-full truncate font-semibold">
                  {sharedText}
                </Chip>
              </ListCell>
              <ListCell align="end" className="font-semibold text-ink">
                {money(row.amount)}
              </ListCell>
              <ListRowActions>
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label={t("Actions for this expense")} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
                    {view.closed ? <Lock className="size-4" aria-hidden="true" /> : <MoreVertical className="size-4.5" aria-hidden="true" />}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                    <DropdownMenuItem onSelect={() => onEdit(row)} className="rounded-md px-3 py-2 text-body text-ink focus:bg-surface-sunken">
                      <Pencil className="size-4" aria-hidden="true" />
                      {t("Edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onRemove(row)} className="rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
                      <Trash2 className="size-4" aria-hidden="true" />
                      {t("Delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ListRowActions>
            </ListRow>
          );
        })}
      </ListCard>
    </div>
  );
}
