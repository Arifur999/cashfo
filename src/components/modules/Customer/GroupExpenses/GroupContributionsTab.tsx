"use client";

import { Calendar, Lock, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow, ListRowActions, ListTotalRow } from "@/components/smartly/list";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { GroupContribution } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { contributionsByMember, contributionTotals, countLabel, dayLabel, rangeLabel } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { Figure } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupContributionsTabProps {
  data: GroupPageData;
  view: GroupView;
  onAdd: () => void;
  onEdit: (row: GroupContribution) => void;
  onRemove: (row: GroupContribution) => void;
}

type Kind = "all" | "deposit" | "return";
// Date, member, type, note, amount and the menu.
const COLUMNS = "md:grid-cols-[64px_minmax(0,1fr)_112px_minmax(0,1fr)_112px_44px]";

// What a contribution is called, the same here as on the statement.
const kindLabel = (row: GroupContribution) => (row.kind === "SETTLE" ? "Settle up" : row.kind === "CARRY" ? "Carried over" : Number(row.amount) < 0 ? "Return" : "Deposit");

// Money in: what each member handed to the fund this month, and what the
// fund handed back.
export function GroupContributionsTab({ data, view, onAdd, onEdit, onRemove }: GroupContributionsTabProps) {
  const { t, locale } = useLocale();
  const { currency } = data;
  const [memberId, setMemberId] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const totals = contributionTotals(data.contributions);
  const perMember = contributionsByMember(data.contributions, data.members);
  const rows = [...data.contributions]
    .filter((c) => (!memberId || c.groupMemberId === memberId) && (kind === "all" || (kind === "deposit" ? Number(c.amount) >= 0 : Number(c.amount) < 0)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const shownTotal = rows.reduce((sum, c) => sum + Number(c.amount), 0);
  const money = (value: number | string) => formatCurrency(value, currency);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 md:px-6">
      <NativeSelect size="sm" aria-label={t("Member")} value={memberId} onChange={(event) => setMemberId(event.target.value)} className="font-medium">
        <option value="">{t("All members")}</option>
        {data.members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect size="sm" aria-label={t("Type")} value={kind} onChange={(event) => setKind(event.target.value as Kind)} className="font-medium">
        <option value="all">{t("Deposits and returns")}</option>
        <option value="deposit">{t("Deposits")}</option>
        <option value="return">{t("Returns")}</option>
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
        {t("Add contribution")}
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card padding="none" className="flex flex-col gap-3 px-5 pt-3 pb-4">
        <div className="flex flex-wrap items-center gap-5">
          <Figure label={t("Contributed")} value={money(totals.deposited)} tone="text-income" />
          <Figure label={t("Returned")} value={money(totals.returned)} tone={totals.returned > 0 ? "text-ink" : "text-ink-muted"} />
          <Figure label={t("Net in the fund")} value={money(totals.net)} divided={false} />
        </div>
        {perMember.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-small text-ink-muted">{t("By member")}</span>
            {perMember.map(({ member, amount }) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setMemberId(memberId === member.id ? "" : member.id)}
                aria-pressed={memberId === member.id}
                className={cn("flex h-7.5 items-center gap-2 rounded-full border py-0 pr-3 pl-1 text-small tabular-nums transition-colors pointer-coarse:h-11", memberId === member.id ? "border-emerald bg-mint-50 text-ink" : "border-line bg-strip text-ink-2 hover:border-line-strong")}
              >
                <PersonAvatar name={member.name} src={member.photoUrl} size={22} coloured />
                {member.name}
                <b className="text-ink">{money(amount)}</b>
              </button>
            ))}
          </div>
        )}
      </Card>

      <ListCard label={t("Contributions in {month}", { month: monthName(data.range.key, locale) })} header={toolbar}>
        <ListHead columns={COLUMNS}>
          <ListHeadCell>{t("Date")}</ListHeadCell>
          <ListHeadCell>{t("Member")}</ListHeadCell>
          <ListHeadCell>{t("Type")}</ListHeadCell>
          <ListHeadCell>{t("Note")}</ListHeadCell>
          <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
          <ListHeadCell>
            <span className="sr-only">{t("Actions")}</span>
          </ListHeadCell>
        </ListHead>
        {rows.length === 0 && <ListEmpty title={data.contributions.length === 0 ? t("No contribution this month yet.") : t("No entry matches.")} />}
        {rows.map((row) => {
          const amount = Number(row.amount);
          const isReturn = amount < 0;
          const member = view.memberById[row.groupMemberId] ?? row.groupMember;
          const day = dayLabel(row.date, locale);
          return (
            <ListRow key={row.id} columns={COLUMNS} className="grid-cols-[minmax(0,1fr)_auto_44px] gap-x-3 tabular-nums md:gap-x-4">
              <ListCell className="hidden text-ink-2 md:block">{day}</ListCell>
              <ListCell className="flex items-center gap-2 font-medium text-ink">
                <PersonAvatar name={member.name} src={member.photoUrl} size={26} coloured />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{member.name}</span>
                  {/* The day, the type and the note, on a phone. */}
                  <span className="truncate text-caption font-normal text-ink-muted md:hidden">{[day, t(kindLabel(row)), row.note].filter(Boolean).join(" · ")}</span>
                </span>
              </ListCell>
              <ListCell className="hidden md:block">
                <Chip tone={row.kind === "SETTLE" || row.kind === "CARRY" ? "neutral" : isReturn ? "expense" : "income"} size="sm" className="font-semibold">
                  {t(kindLabel(row))}
                </Chip>
              </ListCell>
              <ListCell className={cn("hidden truncate md:block", row.note ? "text-ink-2" : "text-ink-muted")}>{row.note || "—"}</ListCell>
              <ListCell align="end" className={cn("font-semibold", isReturn ? "text-expense" : "text-income")}>
                {formatSignedCurrency(amount, currency)}
              </ListCell>
              <ListRowActions>
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label={t("Actions for this entry")} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
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
        {rows.length > 0 && (
          <ListTotalRow columns={COLUMNS} className="grid-cols-[minmax(0,1fr)_auto_44px] gap-x-3 tabular-nums md:gap-x-4">
            <span role="cell" className="md:col-span-4">
              {t("Total")}
            </span>
            <span role="cell" className={cn("text-right", shownTotal < 0 ? "text-expense" : "text-income")}>
              {formatSignedCurrency(shownTotal, currency)}
            </span>
            <span role="cell" />
          </ListTotalRow>
        )}
      </ListCard>
    </div>
  );
}
