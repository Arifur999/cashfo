"use client";

import { Calendar, Lock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow, ListRowActions, ListTotalRow } from "@/components/smartly/list";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { GroupContribution } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { contributionsByMember, contributionTotals, countLabel, dayLabel, rangeLabel, shortName } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { type FormatLocale, langOf } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./GroupBits";
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
const COLUMNS = "md:grid-cols-[90px_minmax(0,1fr)_150px_minmax(0,1fr)_130px_44px]";

// "01 Sep", as the list's date column writes a day.
const listDay = (day: string, locale: FormatLocale) => (langOf(locale) === "en" ? toLocaleDigits(dayLabel(day, "en").padStart(6, "0"), locale) : dayLabel(day, locale));

// What a contribution is called, the same here as on the statement.
const kindLabel = (row: GroupContribution) => (row.kind === "SETTLE" ? "Settle up" : row.kind === "CARRY" ? "Carried over" : Number(row.amount) < 0 ? "Return" : "Deposit");

// Money in: what each member handed to the fund this month, and what the
// fund handed back.
export function GroupContributionsTab({ data, view, onAdd, onEdit, onRemove }: GroupContributionsTabProps) {
  const { t, fmt } = useLocale();
  const { currency } = data;
  const [memberId, setMemberId] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const totals = contributionTotals(data.contributions);
  const perMember = contributionsByMember(data.contributions, data.members);
  const rows = [...data.contributions]
    .filter((c) => (!memberId || c.groupMemberId === memberId) && (kind === "all" || (kind === "deposit" ? Number(c.amount) >= 0 : Number(c.amount) < 0)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const shownTotal = rows.reduce((sum, c) => sum + Number(c.amount), 0);
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  // Own-pocket payments count as money in, but they are entered as expenses.
  const pocket = data.settlement.members.reduce((sum, row) => sum + Number(row.pocketPaid), 0);
  const mess = data.settings.kind === "MESS";

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 md:px-5">
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
      {/* The month's days: the month is picked in the header. */}
      <span className="flex h-9 items-center gap-2 rounded-full border border-input bg-surface px-3 text-small font-medium text-ink">
        <Calendar className="size-3.5 text-ink-muted" aria-hidden="true" />
        {rangeLabel(data.range, fmt)}
      </span>
      <span className="flex-1" />
      <span className="text-small text-ink-muted">{countLabel(t, fmt, rows.length, "{count} entry", "{count} entries")}</span>
      {/* A family adds money in from the header; a mess's header adds meals. */}
      {mess && (
        <Button size="sm" onClick={onAdd} className="gap-1.5">
          <Plus strokeWidth={2.5} />
          {t("Add contribution")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card padding="none" className="flex flex-col gap-3 px-5 pt-3 pb-3.5">
        <div className="flex flex-wrap items-center gap-5.5">
          {[
            { label: t("Contributed"), value: money(totals.deposited), tone: "text-income" },
            { label: t("Returned"), value: money(totals.returned), tone: totals.returned > 0 ? "text-ink" : "text-ink-faint" },
            { label: t("Net in the fund"), value: money(totals.net), tone: "text-ink" },
          ].map((figure, i) => (
            <div key={figure.label} className="flex items-center gap-5.5">
              {i > 0 && <span className="h-8.5 w-px bg-line" aria-hidden="true" />}
              <div className="flex flex-col gap-0.5">
                <span className="text-caption text-ink-muted">{figure.label}</span>
                <span className={cn("text-xl leading-normal font-bold tabular-nums", figure.tone)}>{figure.value}</span>
              </div>
            </div>
          ))}
        </div>
        {perMember.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[12.5px] text-ink-muted">{t("By member")}</span>
            {perMember.map(({ member, amount }) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setMemberId(memberId === member.id ? "" : member.id)}
                aria-pressed={memberId === member.id}
                className={cn("flex h-7.5 items-center gap-1.5 rounded-full border py-0 pr-2.5 pl-1 text-[12.5px] tabular-nums transition-colors pointer-coarse:h-11", memberId === member.id ? "border-emerald bg-mint-50 text-ink" : "border-line bg-strip text-ink-2 hover:border-input")}
              >
                <MemberAvatar member={member} members={data.members} size={22} className="text-[9px]" />
                {shortName(member.name)}
                <b className="font-bold text-ink">{money(amount)}</b>
              </button>
            ))}
          </div>
        )}
      </Card>

      <ListCard label={t("Contributions in {month}", { month: monthName(data.range.key, fmt) })} header={toolbar}>
        <ListHead columns={COLUMNS} className="gap-x-3.5 border-t md:px-5">
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
          const day = dayLabel(row.date, fmt);
          return (
            <ListRow key={row.id} columns={COLUMNS} density="dense" className="grid-cols-[minmax(0,1fr)_auto_44px] gap-x-3 tabular-nums md:gap-x-3.5 md:px-5 md:py-1">
              <ListCell className="hidden text-ink-soft md:block">{listDay(row.date, fmt)}</ListCell>
              <ListCell className="flex items-center gap-2 font-medium text-ink">
                <MemberAvatar member={member} members={data.members} size={26} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate" title={member.name}>
                    {shortName(member.name)}
                  </span>
                  {/* The day, the type and the note, on a phone. */}
                  <span className="truncate text-caption font-normal text-ink-muted md:hidden">{[day, t(kindLabel(row)), row.note].filter(Boolean).join(" · ")}</span>
                </span>
              </ListCell>
              <ListCell className="hidden md:block">
                <Chip tone={row.kind === "SETTLE" || row.kind === "CARRY" ? "neutral" : isReturn ? "expense" : "income"} className={row.kind === "SETTLE" || row.kind === "CARRY" ? "text-ink-soft" : undefined}>
                  {t(kindLabel(row))}
                </Chip>
              </ListCell>
              <ListCell className={cn("hidden truncate md:block", row.note ? "text-ink-2" : "text-input")}>{row.note || "—"}</ListCell>
              <ListCell align="end" className={cn("font-semibold", isReturn ? "text-expense" : "text-income")}>
                {formatSignedCurrency(amount, currency, fmt)}
              </ListCell>
              <ListRowActions>
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label={t("Actions for this entry")} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken data-open:bg-surface-sunken pointer-coarse:size-11">
                    {view.closed ? <Lock className="size-4" aria-hidden="true" /> : <MoreHorizontal className="size-4" strokeWidth={2.5} aria-hidden="true" />}
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
          <ListTotalRow columns={COLUMNS} className="min-h-11.5 grid-cols-[minmax(0,1fr)_auto_44px] gap-x-3 tabular-nums md:gap-x-3.5 md:px-5">
            <span role="cell" className="md:col-span-3">
              {t("Total")}
            </span>
            {/* Money paid from a pocket is money in too, entered as an expense. */}
            <span role="cell" className="hidden text-[12.5px] leading-normal font-medium text-ink-muted md:block">
              {pocket > 0 && t(mess ? "Own-pocket bazar ({amount}) is credited on the Expenses tab" : "Own-pocket payments ({amount}) are credited on the Expenses tab", { amount: money(pocket) })}
            </span>
            <span role="cell" className={cn("text-right", shownTotal < 0 ? "text-expense" : "text-income")}>
              {money(shownTotal)}
            </span>
            <span role="cell" />
          </ListTotalRow>
        )}
      </ListCard>
    </div>
  );
}
