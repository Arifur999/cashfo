"use client";

import { ArrowLeftRight, ArrowUpRight, Pencil, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import DayInput from "@/components/smartly/form/DayInput";
import type { GroupCashbookRow } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { formatCurrency } from "@/lib/customer/currency";
import { groupMonthOf, groupTabHref, shiftMonth, shortName } from "@/lib/customer/groupDisplay";
import { monthName } from "@/lib/customer/insights";
import { deleteGroupHandoverAction } from "@/lib/customer/groupExpensesActions";
import { isAccountant, mainAccountantId } from "@/lib/customer/groupFamily";
import { formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { groupLine, MemberAvatar } from "./GroupBits";
import { ROLE_CHIP, roleKey } from "./GroupSetup";
import { GroupStatement, type StatementSpec } from "./GroupStatement";
import { type HandoverDraft, HandoverDialog } from "./HandoverDialog";
import type { GroupPageData, GroupView } from "./groupTypes";


interface GroupCashbookTabProps {
  data: GroupPageData;
  view: GroupView;
  onAccountant: (id: string | null) => void;
  busy: boolean;
  // A paused group takes no new handovers.
  canAdd: boolean;
  // Whether the one looking may change or delete a handover, and an
  // Editor's own member record (they hand over only their own cash).
  canTouch: (row: { createdByUserId?: string | null }, date: string) => boolean;
  selfOnly: string | null;
}

// Each accountant's cash (the FamilyCashbook boards): money in from the
// deposits given to them, money out for the expenses they paid and what
// they returned, and cash handed from one holder to another (v16), with
// the cash in hand after each. Deposits and expenses are added on their own
// pages; handovers are added, edited and deleted here.
export function GroupCashbookTab({ data, view, onAccountant, busy, canAdd, canTouch, selfOnly }: GroupCashbookTabProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [handover, setHandover] = useState<{ open: boolean; editing: HandoverDraft | null }>({ open: false, editing: null });
  const [removing, setRemoving] = useState<HandoverDraft | null>(null);
  const [isPending, startTransition] = useTransition();
  // Who can keep group cash, and what each holds at the end of the month on show.
  const holderId = mainAccountantId(data.settings, data.members);
  const holders = data.members.filter((member) => isAccountant(member) || member.id === holderId);
  const holderCash = Object.fromEntries((data.settlement.accountantCash ?? []).map((row) => [row.groupMemberId, Number(row.cash)]));
  const groupCash = Object.values(holderCash).reduce((sum, value) => sum + value, 0);
  const { currency, startDay } = data;
  const book = data.cashbook;
  const [printing, setPrinting] = useState(false);
  const [printFrom, setPrintFrom] = useState("");
  const [printTo, setPrintTo] = useState("");
  const money = (value: number | string) => formatCurrency(Math.abs(Number(value)), currency, fmt);
  const accountants = book?.accountants ?? [];
  const chosenId = data.cashbookAccountant;
  const chosen = chosenId ? accountants.find((a) => a.groupMemberId === chosenId) : undefined;
  const names = accountants.map((a) => shortName(a.name));
  const closing = Number(book?.closing ?? 0);
  const rows = book?.rows ?? [];
  const opening = Number(book?.opening ?? 0);
  const memberOf = (id: string) => view.memberById[id];

  const partyText = (row: GroupCashbookRow) => (row.source === "HANDOVER" ? (row.kind === "IN" ? t("Handover from {name}", { name: row.party }) : t("Handover to {name}", { name: row.party })) : row.kind === "IN" ? t("From {name}", { name: row.party }) : row.returned ? t("To {name}", { name: row.party }) : row.party);
  // A handover row as the dialog edits it: OUT is the giver's side, IN the receiver's.
  const draftOf = (row: GroupCashbookRow): HandoverDraft | null =>
    row.source === "HANDOVER" && row.otherId ? { id: row.id, fromId: row.kind === "OUT" ? row.accountantId : row.otherId, toId: row.kind === "OUT" ? row.otherId : row.accountantId, amount: Number(row.amount), date: row.date, note: row.note } : null;

  function removeHandover() {
    if (!removing) return;
    const id = removing.id;
    startTransition(async () => {
      const result = await attempt(() => deleteGroupHandoverAction(data.businessId, id), t(OFFLINE_MESSAGE), t(STALE_MESSAGE));
      if (!result.success) {
        toast.error(result.message ?? t("Failed to delete the handover"));
        return;
      }
      toast.success(t("Handover deleted"));
      setRemoving(null);
      router.refresh();
    });
  }

  function openPrint() {
    setPrintFrom(data.periodRange?.from ?? "");
    setPrintTo(data.periodRange?.to && data.periodRange.to < data.today ? data.periodRange.to : data.today);
    setPrinting(true);
  }

  // The statement between the two days picked, inside the period on show:
  // its opening is the cash before the first of them.
  const statement = (): StatementSpec => {
    const from = printFrom || data.periodRange?.from || "";
    const to = printTo || data.today;
    const inside = rows.filter((row) => row.date >= from && row.date <= to);
    const before = rows.filter((row) => row.date < from);
    const open = before.length ? Number(before[before.length - 1].balance) : opening;
    const totalIn = inside.filter((row) => row.kind === "IN").reduce((sum, row) => sum + Number(row.amount), 0);
    const totalOut = inside.filter((row) => row.kind === "OUT").reduce((sum, row) => sum + Number(row.amount), 0);
    const close = open + totalIn - totalOut;
    const signed = (value: number) => `${value < 0 ? "− " : ""}${money(value)}`;
    const acName = chosen ? chosen.name : names.length ? t("All accountants ({names})", { names: names.join(", ") }) : t("All accountants");
    return {
      title: t("Cash book statement"),
      sub: `${acName} · A4`,
      group: groupLine(t, data.name, data.settings.kind),
      generated: t("Generated {date}", { date: formatDay(data.today, "d MMM yyyy", fmt) }),
      meta: [
        { label: t("Accountant"), value: acName },
        { label: t("Period"), value: `${formatDay(from, "d MMM yyyy", fmt)} – ${formatDay(to, "d MMM yyyy", fmt)}` },
        { label: t("Entries"), value: t("{count} · Currency {code}", { count: formatCount(inside.length, fmt), code: currency }) },
      ],
      boxes: [
        { label: t("Opening"), value: signed(open) },
        { label: t("Money in"), value: money(totalIn) },
        { label: t("Money out"), value: money(totalOut) },
        { label: t("Closing"), value: signed(close) },
      ],
      columns: [{ label: "#" }, { label: t("Date") }, { label: t("Accountant") }, { label: t("From / Spent on") }, { label: t("Note") }, { label: t("In"), end: true }, { label: t("Out"), end: true }, { label: t("Cash"), end: true }],
      lead: ["", t("Opening balance"), "", "", "", "", "", signed(open)],
      rows: inside.map((row, i) => [formatCount(i + 1, fmt), formatDay(row.date, "d MMM yyyy", fmt), row.accountantName ?? "", partyText(row), row.note || "—", row.kind === "IN" ? money(row.amount) : "—", row.kind === "OUT" ? money(row.amount) : "—", signed(Number(row.balance))]),
      tail: ["", t("Closing balance"), "", "", "", money(totalIn), money(totalOut), signed(close)],
      empty: t("No entries between these dates."),
      footer: t("Money in comes from Contributions, money out from Expenses; handovers move cash between holders."),
    };
  };

  // Each accountant's month from every book: what came in, went out, and moved between holders.
  const allRows = data.cashbookAll?.rows ?? rows;
  const statsOf = (id: string) => {
    const mine = allRows.filter((row) => row.accountantId === id);
    const sum = (list: GroupCashbookRow[]) => list.reduce((total, row) => total + Number(row.amount), 0);
    return {
      received: sum(mine.filter((row) => row.source === "CONTRIBUTION" && row.kind === "IN")),
      paidOut: sum(mine.filter((row) => row.source !== "HANDOVER" && row.kind === "OUT")),
      handedIn: sum(mine.filter((row) => row.source === "HANDOVER" && row.kind === "IN")),
      handedOut: sum(mine.filter((row) => row.source === "HANDOVER" && row.kind === "OUT")),
    };
  };
  const roleOf = (id: string) => ROLE_CHIP[roleKey(memberOf(id) ?? {})];
  const signedMoney = (value: number) => `${value < -0.004 ? "− " : ""}${money(value)}`;
  const totalIn = rows.filter((row) => row.kind === "IN").reduce((sum, row) => sum + Number(row.amount), 0);
  const totalOut = rows.filter((row) => row.kind === "OUT").reduce((sum, row) => sum + Number(row.amount), 0);
  const typeChip = (row: GroupCashbookRow) =>
    row.source === "HANDOVER"
      ? { label: row.kind === "IN" ? t("Handed in") : t("Handed out"), cls: "bg-info-soft text-info" }
      : row.kind === "IN"
        ? { label: t("Contribution"), cls: "bg-success-soft text-tint-green-ink" }
        : row.returned
          ? { label: t("Return"), cls: "bg-warning-soft text-warning" }
          : { label: t("Expense"), cls: "bg-expense-soft text-expense" };
  const what = (row: GroupCashbookRow) => (row.source === "EXPENSE" ? row.note || row.party : partyText(row));
  const whatSub = (row: GroupCashbookRow) => (row.source === "EXPENSE" ? (row.note ? row.party : "") : row.note || "");
  const LEDGER = "md:grid-cols-[82px_minmax(0,1fr)_150px_120px_124px_136px_84px]";
  const monthLong = monthName(data.range.key, fmt, "long", true);
  const ACTION = "flex size-8.5 items-center justify-center rounded-[9px] border border-line bg-surface text-ink-muted hover:bg-emerald-wash hover:text-emerald";

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="text-[20px] font-semibold text-ink">{t("Cash book · {period}", { period: monthLong })}</h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-baseline gap-2 text-[13px] text-ink-muted">
            {t("Group cash in hand")}
            <b className={cn("text-[17px] font-bold tabular-nums", groupCash < -0.004 ? "text-warning" : "text-ink")}>{signedMoney(groupCash)}</b>
          </span>
          <Button variant="secondary" onClick={openPrint}>
            <Printer aria-hidden="true" />
            {t("Print statement")}
          </Button>
          {canAdd && holders.length > 1 && (
            <Button onClick={() => setHandover({ open: true, editing: null })}>
              <ArrowLeftRight aria-hidden="true" />
              {t("Hand over cash")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {accountants.map((accountant) => {
          const on = accountant.groupMemberId === chosenId;
          const stat = statsOf(accountant.groupMemberId);
          const role = roleOf(accountant.groupMemberId);
          const cash = Number(accountant.cash);
          return (
            <button
              key={accountant.groupMemberId}
              type="button"
              aria-pressed={on}
              onClick={() => !on && onAccountant(accountant.groupMemberId)}
              className={cn("flex flex-col gap-3.5 rounded-card border-[1.5px] bg-surface px-4 py-3.5 text-left shadow-card", on ? "border-emerald" : "border-line-card hover:border-mint-200", busy && "opacity-60")}
            >
              <span className="flex items-start gap-2.5">
                <MemberAvatar member={memberOf(accountant.groupMemberId) ?? { id: accountant.groupMemberId, name: accountant.name, photoUrl: null }} members={data.members} size={36} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14.5px] font-semibold text-ink">{accountant.name}</span>
                  <span className={cn("text-caption font-semibold", role.cls.split(" ").find((c: string) => c.startsWith("text-")))}>{t(role.label)}</span>
                </span>
                <span className="flex flex-col items-end gap-0.5">
                  <span className="text-[11.5px] text-ink-muted">{t("Cash in hand now")}</span>
                  <span className={cn("text-[20px] font-bold tabular-nums", cash < -0.004 ? "text-warning" : "text-ink")}>{signedMoney(cash)}</span>
                </span>
              </span>
              <span className="grid grid-cols-4 gap-2 tabular-nums">
                {(
                  [
                    ["Received", stat.received, "text-tint-green-ink"],
                    ["Paid out", stat.paidOut, "text-expense"],
                    ["Handed in", stat.handedIn, "text-ink"],
                    ["Handed out", stat.handedOut, "text-ink"],
                  ] as const
                ).map(([label, value, tone]) => (
                  <span key={label} className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[11.5px] text-ink-muted">{t(label)}</span>
                    <span className={cn("truncate text-[13.5px] font-semibold", tone)}>{money(value)}</span>
                  </span>
                ))}
              </span>
              <span className="text-caption text-ink-muted">{data.range.key === groupMonthOf(data.today, startDay) ? t("This month so far") : monthLong}</span>
            </button>
          );
        })}
      </div>

      <section aria-label={t("Ledger")} className="flex flex-col overflow-hidden rounded-card border border-line-card bg-surface shadow-card">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          <h3 className="text-[16px] font-semibold text-ink">{t("Ledger")}</h3>
          <div role="tablist" aria-label={t("Accountant")} className="flex gap-0.5 rounded-full bg-quiet-chip p-0.75">
            {accountants.map((accountant) => {
              const on = accountant.groupMemberId === chosenId;
              return (
                <button
                  key={accountant.groupMemberId}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => !on && onAccountant(accountant.groupMemberId)}
                  className={cn("h-8.5 rounded-full px-3.5 text-[13px] font-semibold", on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(18,32,29,0.12)]" : "text-ink-soft hover:text-ink")}
                >
                  {shortName(accountant.name)}
                </button>
              );
            })}
          </div>
          <span className="ml-auto flex gap-4.5 text-right tabular-nums">
            <span className="flex flex-col">
              <span className="text-[11.5px] text-ink-muted">{t("Opening")}</span>
              <span className="text-[15px] font-semibold text-ink">{signedMoney(opening)}</span>
            </span>
            <span className="flex flex-col">
              <span className="text-[11.5px] text-ink-muted">{t("Now")}</span>
              <span className="text-[15px] font-bold text-ink">{signedMoney(closing)}</span>
            </span>
          </span>
        </div>
        <div role="row" className={cn("hidden gap-x-3 border-y border-line bg-table-head px-5 py-2.25 text-caption font-semibold text-ink-muted md:grid", LEDGER)}>
          <span>{t("Date")}</span>
          <span>{t("What")}</span>
          <span>{t("Type")}</span>
          <span className="text-right">{t("In")}</span>
          <span className="text-right">{t("Out")}</span>
          <span className="text-right">{t("Balance")}</span>
          <span className="text-right">{t("Actions")}</span>
        </div>
        <div role="row" className={cn("grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-divider bg-hover px-5 py-3 text-body tabular-nums", LEDGER)}>
          <span className="text-ink-soft max-md:hidden">{formatDay(data.range.from, "d MMM", fmt)}</span>
          <span className="font-semibold text-ink">{t("Opening cash (end of {month})", { month: monthName(shiftMonth(data.range.key, -1), fmt, "long", true) })}</span>
          <span className="max-md:hidden" />
          <span className="max-md:hidden" />
          <span className="max-md:hidden" />
          <span className="text-right font-semibold text-ink">{signedMoney(opening)}</span>
          <span className="max-md:hidden" />
        </div>
        {rows.length === 0 && <p className="px-5 py-6 text-center text-body text-ink-muted">{t("No entries yet this month.")}</p>}
        {rows.map((row) => {
          const balance = Number(row.balance);
          const into = row.kind === "IN";
          const draft = draftOf(row);
          const chip = typeChip(row);
          return (
            <div key={`${row.source}:${row.kind}:${row.id}`} role="row" className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-divider px-5 py-2 text-body tabular-nums md:min-h-12.5", LEDGER)}>
              <span className="text-ink-soft max-md:hidden">{formatDay(row.date, "d MMM", fmt)}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium text-ink">{what(row)}</span>
                {whatSub(row) && <span className="truncate text-caption text-ink-muted">{whatSub(row)}</span>}
              </span>
              <span className="max-md:hidden">
                <span className={cn("inline-flex h-6 items-center rounded-full px-2.25 text-caption font-semibold", chip.cls)}>{chip.label}</span>
              </span>
              <span className={cn("text-right max-md:hidden", into ? "font-semibold text-tint-green-ink" : "text-ink-faint")}>{into ? `+ ${money(row.amount)}` : "–"}</span>
              <span className={cn("text-right max-md:hidden", !into ? "font-semibold text-expense" : "text-ink-faint")}>{!into ? `− ${money(row.amount)}` : "–"}</span>
              <span className={cn("text-right font-semibold", balance < -0.004 ? "text-expense" : "text-ink")}>{signedMoney(balance)}</span>
              <span className="flex justify-end gap-1 max-md:col-span-2">
                {draft ? (
                  canTouch(row, row.date) && (
                    <>
                      <button type="button" onClick={() => setHandover({ open: true, editing: draft })} aria-label={t("Edit handover")} className={ACTION}>
                        <Pencil className="size-3.75" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => setRemoving(draft)} aria-label={t("Delete handover")} className={cn(ACTION, "hover:bg-expense-soft hover:text-expense-fill")}>
                        <Trash2 className="size-3.75" aria-hidden="true" />
                      </button>
                    </>
                  )
                ) : (
                  <Link href={groupTabHref(data.businessId, row.source === "EXPENSE" ? "expenses" : "contributions", { month: data.range.key })} aria-label={row.source === "EXPENSE" ? t("Open in Expenses") : t("Open in Contributions")} className={ACTION}>
                    <ArrowUpRight className="size-3.75" aria-hidden="true" />
                  </Link>
                )}
              </span>
            </div>
          );
        })}
        <div role="row" className={cn("grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 bg-hover px-5 py-3 text-body font-semibold tabular-nums", LEDGER)}>
          <span className="max-md:hidden" />
          <span className="text-ink">{t("Cash in hand now")}</span>
          <span className="max-md:hidden" />
          <span className="text-right text-tint-green-ink max-md:hidden">+ {money(totalIn)}</span>
          <span className="text-right text-expense max-md:hidden">− {money(totalOut)}</span>
          <span className="text-right text-ink">{signedMoney(closing)}</span>
          <span className="max-md:hidden" />
        </div>
      </section>

      <HandoverDialog open={handover.open} onClose={() => setHandover({ open: false, editing: null })} businessId={data.businessId} currency={currency} holders={holders} cash={holderCash} today={data.today} editing={handover.editing} selfOnly={selfOnly} />
      <ConfirmDialog
        open={removing !== null}
        onClose={() => !isPending && setRemoving(null)}
        onConfirm={removeHandover}
        icon={<Trash2 />}
        title={t("Delete this handover?")}
        description={removing ? `${shortName(memberOf(removing.fromId)?.name)} → ${shortName(memberOf(removing.toId)?.name)} · ${money(removing.amount)}. ${t("Only who keeps the cash changes back. Nobody’s balance changes.")}` : ""}
        confirmLabel={t("Delete handover")}
        danger
        isPending={isPending}
      />
      <GroupStatement
        open={printing}
        onClose={() => setPrinting(false)}
        spec={printing ? statement() : null}
        tools={
          <span className="flex items-end gap-2">
            <label className="flex flex-col gap-0.5 text-caption text-ink-muted">
              {t("From")}
              <DayInput size="sm" value={printFrom} onChange={setPrintFrom} min={data.periodRange?.from} max={printTo || data.today} aria-label={t("From")} />
            </label>
            <label className="flex flex-col gap-0.5 text-caption text-ink-muted">
              {t("To")}
              <DayInput size="sm" value={printTo} onChange={setPrintTo} min={printFrom || data.periodRange?.from} max={data.today} aria-label={t("To")} />
            </label>
          </span>
        }
      />
    </div>
  );
}
