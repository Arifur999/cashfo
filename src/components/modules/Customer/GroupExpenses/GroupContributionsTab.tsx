"use client";

import { Banknote, Lock, Pencil, Plus, Printer, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import Input from "@/components/smartly/form/Input";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import type { GroupContribution, GroupExpense, GroupMember } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { countLabel, dayLabel, groupMonthOf, isDayClosed, paidIn } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { groupLine, MemberAvatar } from "./GroupBits";
import { GroupStatement, type StatementSpec } from "./GroupStatement";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupContributionsTabProps {
  data: GroupPageData;
  view: GroupView;
  // With a member: the form opens with them picked.
  onAdd: (memberId?: string) => void;
  onEdit: (row: GroupContribution) => void;
  onRemove: (row: GroupContribution) => void;
  // An own-pocket row is an expense: it opens and deletes as one.
  onEditExpense: (row: GroupExpense) => void;
  onRemoveExpense: (row: GroupExpense) => void;
  canAdd: boolean;
}

// #, date, member, received by, note (with its type), amount, actions.
const COLUMNS = "md:grid-cols-[36px_64px_minmax(0,1.2fr)_minmax(0,160px)_minmax(0,1fr)_120px_76px]";
const PAGE = 25;

type RowType = "DEPOSIT" | "POCKET" | "RETURN" | "SETTLE" | "CARRY";

const TYPE_LABELS: Record<RowType, string> = { DEPOSIT: "Deposit", POCKET: "Own pocket", RETURN: "Return", SETTLE: "Settle up", CARRY: "Carried over" };
const TYPE_TONES = { DEPOSIT: "income", POCKET: "warning", RETURN: "expense", SETTLE: "info", CARRY: "neutral" } as const satisfies Record<RowType, string>;

interface Row {
  id: string;
  date: string;
  createdAt: string;
  member: GroupMember | undefined;
  memberName: string;
  givenTo: GroupMember | null | undefined;
  type: RowType;
  note: string | null;
  amount: number;
  contribution?: GroupContribution;
  expense?: GroupExpense;
}

// Money in (the v7 FamilyContributions board): every deposit with the
// accountant it was given to, and what members paid from their own pocket
// (an expense, credited to them), by member, type and period, with a
// printable statement. Returns, settle-ups and carried balances still list,
// as they count in the balances.
export function GroupContributionsTab({ data, view, onAdd, onEdit, onRemove, onEditExpense, onRemoveExpense, canAdd }: GroupContributionsTabProps) {
  const { t, fmt } = useLocale();
  const { currency, startDay } = data;
  const [query, setQuery] = useState("");
  const [memberId, setMemberId] = useState("");
  const type = "" as "" | RowType;
  const [limit, setLimit] = useState(PAGE);
  const [printing, setPrinting] = useState(false);
  // The month picked in the header.
  const label = monthName(data.range.key, fmt, "long", true);
  const money = (value: number | string) => formatCurrency(value, currency, fmt);

  const contributionRows: Row[] = (data.periodContributions ?? data.contributions).map((row) => ({
    id: row.id,
    date: row.date.slice(0, 10),
    createdAt: row.createdAt,
    member: view.memberById[row.groupMemberId] ?? row.groupMember,
    memberName: row.groupMember?.name ?? view.memberById[row.groupMemberId]?.name ?? "",
    givenTo: row.receivedByMemberId ? (view.memberById[row.receivedByMemberId] ?? row.receivedBy) : null,
    type: row.kind === "DEPOSIT" || row.kind === "RETURN" ? (Number(row.amount) < 0 ? "RETURN" : "DEPOSIT") : row.kind,
    note: row.note,
    amount: Number(row.amount),
    contribution: row,
  }));
  // Own-pocket spending lists on Expenses: here only money handed in.
  const all = contributionRows;
  const words = query.trim().toLowerCase();
  const rows = all
    .filter((row) => (!memberId || row.member?.id === memberId) && (!type || row.type === type))
    .filter((row) => !words || [row.memberName, row.note ?? "", row.givenTo?.name ?? "", String(Math.abs(row.amount))].some((text) => text.toLowerCase().includes(words))).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const shown = rows.slice(0, limit);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const memberOptions = data.members.filter((member) => member.status === "ACTIVE" || all.some((row) => row.member?.id === member.id));
  const memberLabel = memberId ? (view.memberById[memberId]?.name ?? "") : t("All members");
  const typeLabel = type ? t(TYPE_LABELS[type]) : t("All types");
  const givenText = (row: Row) => row.givenTo?.name ?? "—";
  // The month on show, member by member: what each gave, their share and balance.
  const month = monthName(data.range.key, fmt, "long", true);
  const current = data.range.key === groupMonthOf(data.today, startDay);
  // What each handed in this month: their contributions, without a balance carried in.
  const carried = (id: string) => data.contributions.filter((row) => row.kind === "CARRY" && row.groupMemberId === id).reduce((sum, row) => sum + Number(row.amount), 0);
  const gaveOf = (row: (typeof data.settlement.members)[number]) => Number(row.contributed) - carried(row.groupMemberId);
  const byMember = data.settlement.members.map((row) => ({ row, member: view.memberById[row.groupMemberId] })).filter(({ row, member }) => member?.status === "ACTIVE" || paidIn(row) !== 0 || Number(row.share) !== 0);
  const givenInMonth = byMember.reduce((sum, { row }) => sum + gaveOf(row), 0);

  const statement = (): StatementSpec => ({
    title: t("Contributions statement"),
    sub: `${memberLabel} · ${typeLabel} · ${label}`,
    group: groupLine(t, data.name, data.settings.kind),
    generated: t("Generated {date}", { date: formatDay(data.today, "d MMM yyyy", fmt) }),
    meta: [
      { label: t("Member"), value: memberLabel },
      { label: t("Type"), value: typeLabel },
      { label: t("Period"), value: label },
      { label: t("Total"), value: `${money(total)} · ${countLabel(t, fmt, rows.length, "{count} entry", "{count} entries")}` },
    ],
    columns: [{ label: "#" }, { label: t("Date") }, { label: t("Member") }, { label: t("Given to") }, { label: t("Type") }, { label: t("Note") }, { label: t("Amount"), end: true }],
    rows: rows.map((row, i) => [formatCount(i + 1, fmt), formatDay(row.date, "d MMM yyyy", fmt), row.memberName, givenText(row), t(TYPE_LABELS[row.type]), row.note || "—", formatSignedCurrency(row.amount, currency, fmt)]),
    tail: rows.length ? ["", t("Total"), "", "", "", "", formatSignedCurrency(total, currency, fmt)] : undefined,
    empty: t("No contributions match these filters."),
    footer: t("Deposit = cash given to an accountant. Own pocket = paid with own money."),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="text-[19px] font-semibold text-ink">{t("Contributions · {period}", { period: label })}</h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" onClick={() => setPrinting(true)}>
            <Printer aria-hidden="true" />
            {t("Print")}
          </Button>
          {canAdd && (
            <Button onClick={() => onAdd()}>
              <Plus aria-hidden="true" />
              {t("Add contribution")}
            </Button>
          )}
        </div>
      </div>

      {byMember.length > 0 && (
        <Card padding="none" className="flex flex-col gap-3.5 px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="flex flex-wrap items-baseline gap-x-3">
              <h3 className="text-[16px] font-semibold text-ink">{current ? t("This month by member") : t("{month} by member", { month })}</h3>
              <span className="text-caption text-ink-muted">{t("Balance carries on from earlier months.")}</span>
            </span>
            <span className="flex items-baseline gap-3">
              <span className="text-caption text-ink-muted">{t("Given in {month}", { month })}</span>
              <span className="text-[19px] font-bold text-income tabular-nums">{money(givenInMonth)}</span>
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {byMember.map(({ row, member }) => {
              const gave = gaveOf(row);
              const balance = Number(row.balance);
              const even = Math.abs(balance) < 0.005;
              return (
                <div key={row.groupMemberId} className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-line px-3.5 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <MemberAvatar member={member ?? { id: row.groupMemberId, name: row.name, photoUrl: null }} members={data.members} size={28} />
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">{row.name}</span>
                    {gave <= 0 && member?.status === "ACTIVE" && (
                      <Chip tone="warning" size="sm">
                        {t("Not paid yet")}
                      </Chip>
                    )}
                    {canAdd && member?.status === "ACTIVE" && (
                      <button type="button" onClick={() => onAdd(member.id)} aria-label={t("Add a contribution from {name}", { name: row.name })} className="flex size-7.5 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                        <Plus className="size-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <dl className="grid grid-cols-3 gap-2 tabular-nums">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-caption text-ink-muted">{t("Gave")}</dt>
                      <dd className="truncate text-body font-semibold text-income">{money(gave)}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-caption text-ink-muted">{t("Share")}</dt>
                      <dd className="truncate text-body font-semibold text-ink">{money(row.share)}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-caption text-ink-muted">{t("Balance")}</dt>
                      <dd className={cn("truncate text-body font-semibold", even ? "text-ink" : balance > 0 ? "text-income" : "text-expense")}>{even ? money(0) : formatSignedCurrency(balance, currency, fmt)}</dd>
                      <dd className={cn("text-[11.5px] font-semibold", even ? "text-ink-muted" : balance > 0 ? "text-income" : "text-expense")}>{even ? t("All square") : balance > 0 ? t("Group owes them") : t("Owes the group")}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <ListCard
        label={t("Contributions")}
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
              placeholder={t("Search name, note or amount…")}
              aria-label={t("Search contributions")}
              leading={<Search className="ml-2.5 size-4 text-ink-muted" aria-hidden="true" />}
              frameClassName="w-full sm:w-72"
            />
            <NativeSelect
              size="sm"
              aria-label={t("Member")}
              value={memberId}
              onChange={(event) => {
                setMemberId(event.target.value);
                setLimit(PAGE);
              }}
              className="font-medium"
            >
              <option value="">{t("All members")}</option>
              {memberOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </NativeSelect>
            <span className="ml-auto flex flex-col items-end leading-tight">
              <span className="text-caption text-ink-muted">{t("Total · {entries}", { entries: countLabel(t, fmt, rows.length, "{count} entry", "{count} entries") })}</span>
              <span className={cn("text-[18px] font-bold tabular-nums", total < 0 ? "text-expense" : "text-income")}>{money(total)}</span>
            </span>
          </div>
        }
        footer={
          rows.length > 0 ? (
            <ListFooter className="flex-row items-center gap-3 bg-hover text-[13px] md:px-5">
              <span className="text-ink-muted">{t("Showing {from} to {to} of {count} · newest first", { from: formatCount(1, fmt), to: formatCount(shown.length, fmt), count: formatCount(rows.length, fmt) })}</span>
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
          <ListHeadCell>#</ListHeadCell>
          <ListHeadCell>{t("Date")}</ListHeadCell>
          <ListHeadCell>{t("Member")}</ListHeadCell>
          <ListHeadCell>{t("Received by")}</ListHeadCell>
          <ListHeadCell>{t("Note")}</ListHeadCell>
          <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
          <ListHeadCell align="end">{t("Actions")}</ListHeadCell>
        </ListHead>
        {shown.length === 0 &&
          (all.length === 0 ? (
            <ListEmpty
              icon={<Banknote />}
              tone="neutral"
              title={t("No contributions match these filters.")}
              action={
                canAdd && (
                  <Button size="sm" onClick={() => onAdd()}>
                    {t("Add the first contribution")}
                  </Button>
                )
              }
            />
          ) : (
            <ListEmpty title={t("No contributions match your search or filter.")} />
          ))}
        {shown.map((row, index) => {
          const closed = isDayClosed(data.history, row.date);
          const edit = () => (row.expense ? onEditExpense(row.expense) : row.contribution && onEdit(row.contribution));
          const remove = () => (row.expense ? onRemoveExpense(row.expense) : row.contribution && onRemove(row.contribution));
          return (
            <ListRow key={`${row.type}:${row.id}`} columns={COLUMNS} className="min-h-12 grid-cols-[minmax(0,1fr)_auto_76px] gap-x-3 tabular-nums md:px-5 md:py-1">
              <ListCell className="hidden text-ink-muted md:block">{formatCount(index + 1, fmt)}</ListCell>
              <ListCell className="hidden text-ink-soft md:block">{formatDay(row.date, "d MMM", fmt)}</ListCell>
              <ListCell className="flex items-center gap-2">
                <MemberAvatar member={row.member ?? { id: row.id, name: row.memberName, photoUrl: null }} members={data.members} size={28} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-ink">{row.memberName}</span>
                  <span className="truncate text-caption font-normal text-ink-muted md:hidden">{[dayLabel(row.date, fmt), t(TYPE_LABELS[row.type]), row.givenTo?.name].filter(Boolean).join(" · ")}</span>
                </span>
              </ListCell>
              <ListCell className="hidden truncate text-ink-2 md:block">{givenText(row)}</ListCell>
              <ListCell className="hidden min-w-0 items-center gap-2 md:flex">
                {row.type !== "DEPOSIT" && (
                  <Chip tone={TYPE_TONES[row.type]} size="sm" className="shrink-0">
                    {t(TYPE_LABELS[row.type])}
                  </Chip>
                )}
                <span className={cn("truncate", row.note ? "text-ink-2" : "text-input")}>{row.note || (row.type === "DEPOSIT" ? "—" : "")}</span>
              </ListCell>
              <ListCell align="end" className={cn("font-semibold", row.amount < 0 ? "text-expense" : "text-income")}>
                {formatSignedCurrency(row.amount, currency, fmt)}
              </ListCell>
              <ListRowActions className="flex justify-end gap-1.5">
                <button type="button" onClick={edit} aria-label={row.expense ? t("Edit expense") : t("Edit contribution")} title={closed ? t("In a closed month") : undefined} className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                  {closed ? <Lock className="size-3.75" aria-hidden="true" /> : <Pencil className="size-3.75" aria-hidden="true" />}
                </button>
                <button type="button" onClick={remove} aria-label={row.expense ? t("Delete expense") : t("Delete contribution")} className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-expense-soft hover:text-expense pointer-coarse:size-11">
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
