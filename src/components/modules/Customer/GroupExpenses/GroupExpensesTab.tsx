"use client";

import { Calendar, Lock, MoreVertical, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { GroupExpense } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { monthName } from "@/lib/customer/insights";
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

const ROW = "md:grid-cols-[70px_168px_minmax(0,1fr)_176px_120px_104px_40px]";
const PAGE = 10;

// Money out: every cost of the month, what it was for, who handed the
// money over, and how it is shared.
export function GroupExpensesTab({ data, view, onAdd, onEdit, onRemove }: GroupExpensesTabProps) {
  const { t, locale } = useLocale();
  const { currency } = data;
  const [category, setCategory] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [showAll, setShowAll] = useState(false);
  const total = data.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const rows = [...data.expenses]
    .filter((e) => (!category || e.category === category) && (!paidBy || e.paidByMemberId === paidBy))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const shown = showAll ? rows : rows.slice(0, PAGE);
  const shownTotal = rows.reduce((sum, e) => sum + Number(e.amount), 0);
  const month = monthName(data.range.key, locale);
  const categoryNames = [...new Set([...data.categories.map((c) => c.name), ...data.expenses.map((e) => e.category)])];

  return (
    <div className="flex flex-col gap-4">
      <Card padding="none" className="flex flex-wrap items-center gap-5 px-5 py-3">
        <Figure label={`${t("Spent in")} ${month}`} value={formatCurrency(total, currency)} />
        <Figure label={t("From the group fund")} value={formatCurrency(total, currency)} />
        <Figure label={t("Share each")} value={formatCurrency(data.settlement.perMemberShare, currency)} divided={false} />
        <span className="flex-1" />
        <span className="text-small leading-relaxed text-ink-2 md:text-right">
          {t("Shared equally among")} {data.settlement.memberCount} {t(data.settlement.memberCount === 1 ? "member" : "members")}
        </span>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          <NativeSelect size="sm" aria-label={t("Category")} value={category} onChange={(event) => setCategory(event.target.value)} className="font-medium">
            <option value="">{t("All categories")}</option>
            {categoryNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect size="sm" aria-label={t("Handed over by")} value={paidBy} onChange={(event) => setPaidBy(event.target.value)} className="font-medium">
            <option value="">{t("Handed over by: anyone")}</option>
            {data.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </NativeSelect>
          <span className="flex h-9.5 items-center gap-2 rounded-md border border-line-strong bg-surface px-3 text-small font-medium text-ink">
            <Calendar className="size-4 text-ink-muted" aria-hidden="true" />
            {formatDate(data.range.from, "d MMM")} – {formatDate(data.range.to, "d MMM yyyy")}
          </span>
          <span className="flex-1" />
          <span className="text-small text-ink-muted">
            {rows.length} {t(rows.length === 1 ? "entry" : "entries")}
          </span>
          <Button size="sm" onClick={onAdd}>
            <Plus strokeWidth={2.25} />
            {t("Add expense")}
          </Button>
        </div>
        <div className={cn("hidden items-center gap-4 border-y border-line bg-cream px-5 py-2 text-caption font-medium text-ink-muted md:grid", ROW)}>
          <span>{t("Date")}</span>
          <span>{t("Category")}</span>
          <span>{t("Description")}</span>
          <span>{t("Handed over by")}</span>
          <span>{t("Shared")}</span>
          <span className="text-right">{t("Amount")}</span>
          <span />
        </div>
        {shown.length === 0 && <p className="border-t border-line px-5 py-10 text-center text-body text-ink-muted">{data.expenses.length === 0 ? t("No expense this month yet.") : t("No entry matches.")}</p>}
        {shown.map((row) => {
          const payer = row.paidByMemberId ? view.memberById[row.paidByMemberId] : null;
          return (
            <div key={row.id} className={cn("grid grid-cols-[minmax(0,1fr)_auto_40px] items-center gap-3 border-b border-surface-sunken px-5 py-2.5 text-body tabular-nums md:min-h-12 md:gap-4 md:py-0", ROW)}>
              <span className="hidden text-ink-2 md:block">{formatDate(row.date, "dd MMM")}</span>
              <span className="flex min-w-0 items-center gap-2">
                <CategoryTile name={row.category} categories={data.categories} />
                <span className="flex min-w-0 flex-col md:block">
                  <span className="truncate font-medium text-ink">{row.category}</span>
                  <span className="truncate text-caption font-normal text-ink-muted md:hidden">
                    {formatDate(row.date, "dd MMM")}
                    {row.description ? ` · ${row.description}` : ""}
                  </span>
                </span>
              </span>
              <span className={cn("hidden truncate md:block", row.description ? "text-ink-2" : "text-ink-muted")}>{row.description || "—"}</span>
              <span className="hidden min-w-0 items-center gap-2 md:flex">
                {payer ? (
                  <>
                    <PersonAvatar name={payer.name} src={payer.photoUrl} size={22} coloured />
                    <span className="truncate font-medium text-ink">{payer.name}</span>
                  </>
                ) : (
                  <span className="flex items-center gap-2 text-ink-2">
                    <Wallet className="size-4 text-ink-muted" aria-hidden="true" />
                    {t("Group fund")}
                  </span>
                )}
              </span>
              <span className="hidden md:block">
                <Chip tone="neutral" size="sm" className="font-semibold">
                  {t("Equally")} · ÷ {data.settlement.memberCount}
                </Chip>
              </span>
              <span className="text-right font-semibold text-ink">{formatCurrency(row.amount, currency)}</span>
              <DropdownMenu>
                <DropdownMenuTrigger aria-label={t("Actions for this expense")} className="flex size-8 items-center justify-center justify-self-end rounded-md text-ink-muted hover:bg-cream data-open:bg-cream">
                  {view.closed ? <Lock className="size-4" aria-hidden="true" /> : <MoreVertical className="size-4.5" aria-hidden="true" />}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                  <DropdownMenuItem onSelect={() => onEdit(row)} className="rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                    <Pencil className="size-4" aria-hidden="true" />
                    {t("Edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onRemove(row)} className="rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t("Delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-cream px-5 py-3 text-small">
            {rows.length > PAGE ? (
              <Button variant="secondary" size="sm" onClick={() => setShowAll(!showAll)}>
                {showAll ? t("Show fewer") : `${t("Show")} ${rows.length - PAGE} ${t("older entries")}`}
              </Button>
            ) : (
              <span />
            )}
            <span className="text-ink-2">
              {t("All")} {rows.length} {t(rows.length === 1 ? "entry adds up to" : "entries add up to")} <b className="font-semibold text-ink tabular-nums">{formatCurrency(shownTotal, currency)}</b>
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
