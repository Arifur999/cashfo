"use client";

import { Banknote, Lock, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import NativeSelect from "@/components/smartly/form/NativeSelect";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowActions } from "@/components/smartly/list";
import type { GroupContribution, GroupExpense, GroupMember } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { countLabel, dayLabel, isDayClosed } from "@/lib/customer/groupDisplay";
import { type GroupPeriod, periodLabel } from "@/lib/customer/groupPeriod";
import { formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { groupLine, MemberAvatar } from "./GroupBits";
import { GroupPeriodPicker } from "./GroupPeriodPicker";
import { GroupStatement, type StatementSpec } from "./GroupStatement";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupContributionsTabProps {
  data: GroupPageData;
  view: GroupView;
  onPeriod: (period: GroupPeriod) => void;
  onAdd: () => void;
  onEdit: (row: GroupContribution) => void;
  onRemove: (row: GroupContribution) => void;
  // An own-pocket row is an expense: it opens and deletes as one.
  onEditExpense: (row: GroupExpense) => void;
  onRemoveExpense: (row: GroupExpense) => void;
  busy: boolean;
  canAdd: boolean;
}

const PERIODS = ["month", "all", "year", "custom"] as const;
// #, date, member, given to, type, note, amount, actions.
const COLUMNS = "md:grid-cols-[36px_64px_minmax(0,1.1fr)_160px_112px_minmax(0,1fr)_110px_76px]";
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
export function GroupContributionsTab({ data, view, onPeriod, onAdd, onEdit, onRemove, onEditExpense, onRemoveExpense, busy, canAdd }: GroupContributionsTabProps) {
  const { t, fmt } = useLocale();
  const { currency, startDay } = data;
  const period = data.period ?? { kind: "month" };
  const [memberId, setMemberId] = useState("");
  const [type, setType] = useState<"" | RowType>("");
  const [limit, setLimit] = useState(PAGE);
  const [printing, setPrinting] = useState(false);
  const label = periodLabel(period, data.today, startDay, t, fmt);
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
  const pocketRows: Row[] = (data.periodExpenses ?? data.expenses)
    .filter((row) => row.paidFrom === "MEMBER" && row.paidByMemberId)
    .map((row) => ({
      id: row.id,
      date: row.date.slice(0, 10),
      createdAt: row.createdAt,
      member: view.memberById[row.paidByMemberId as string],
      memberName: view.memberById[row.paidByMemberId as string]?.name ?? row.paidByMember?.name ?? "",
      givenTo: null,
      type: "POCKET",
      note: [row.category, row.description].filter(Boolean).join(" · "),
      amount: Number(row.amount),
      expense: row,
    }));
  const all = [...contributionRows, ...pocketRows];
  const rows = all.filter((row) => (!memberId || row.member?.id === memberId) && (!type || row.type === type)).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const shown = rows.slice(0, limit);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const types = (["DEPOSIT", "POCKET", "RETURN", "SETTLE", "CARRY"] as const).filter((value) => value === "DEPOSIT" || value === "POCKET" || value === type || all.some((row) => row.type === value));
  const memberOptions = data.members.filter((member) => member.status === "ACTIVE" || all.some((row) => row.member?.id === member.id));
  const memberLabel = memberId ? (view.memberById[memberId]?.name ?? "") : t("All members");
  const typeLabel = type ? t(TYPE_LABELS[type]) : t("All types");
  const givenText = (row: Row) => (row.givenTo ? t("{name} (accountant)", { name: row.givenTo.name }) : "—");

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
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <GroupPeriodPicker value={period} options={PERIODS} today={data.today} startDay={startDay} onChange={onPeriod} busy={busy} />
        {canAdd && (
          <Button onClick={onAdd}>
            <Plus aria-hidden="true" />
            {t("Add contribution")}
          </Button>
        )}
      </div>

      <ListCard
        label={t("Contributions")}
        header={
          <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 md:px-5">
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
            <NativeSelect
              size="sm"
              aria-label={t("Type")}
              value={type}
              onChange={(event) => {
                setType(event.target.value as "" | RowType);
                setLimit(PAGE);
              }}
              className="font-medium"
            >
              <option value="">{t("All types")}</option>
              {types.map((value) => (
                <option key={value} value={value}>
                  {t(TYPE_LABELS[value])}
                </option>
              ))}
            </NativeSelect>
            <span className="ml-auto flex items-center gap-3">
              <span className="flex flex-col items-end leading-tight">
                <span className="text-caption text-ink-muted">{t("Total · {entries}", { entries: countLabel(t, fmt, rows.length, "{count} entry", "{count} entries") })}</span>
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
          <ListHeadCell>{t("Member")}</ListHeadCell>
          <ListHeadCell>{t("Given to")}</ListHeadCell>
          <ListHeadCell>{t("Type")}</ListHeadCell>
          <ListHeadCell>{t("Note")}</ListHeadCell>
          <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
          <ListHeadCell>
            <span className="sr-only">{t("Actions")}</span>
          </ListHeadCell>
        </ListHead>
        {shown.length === 0 &&
          (all.length === 0 ? (
            <ListEmpty
              icon={<Banknote />}
              tone="neutral"
              title={t("No contributions match these filters.")}
              action={
                canAdd && (
                  <Button size="sm" onClick={onAdd}>
                    {t("Add contribution")}
                  </Button>
                )
              }
            />
          ) : (
            <ListEmpty title={t("No contributions match these filters.")} />
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
              <ListCell className="hidden md:block">
                <Chip tone={TYPE_TONES[row.type]}>{t(TYPE_LABELS[row.type])}</Chip>
              </ListCell>
              <ListCell className={cn("hidden truncate md:block", row.note ? "text-ink-2" : "text-input")}>{row.note || "—"}</ListCell>
              <ListCell align="end" className={cn("font-semibold", row.amount < 0 ? "text-expense" : "text-income")}>
                {formatSignedCurrency(row.amount, currency, fmt)}
              </ListCell>
              <ListRowActions className="flex justify-end gap-0.5">
                <button type="button" onClick={edit} aria-label={row.expense ? t("Edit expense") : t("Edit contribution")} title={closed ? t("In a closed month") : undefined} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                  {closed ? <Lock className="size-4" aria-hidden="true" /> : <Pencil className="size-4" aria-hidden="true" />}
                </button>
                <button type="button" onClick={remove} aria-label={row.expense ? t("Delete expense") : t("Delete contribution")} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-expense-soft hover:text-expense pointer-coarse:size-11">
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
