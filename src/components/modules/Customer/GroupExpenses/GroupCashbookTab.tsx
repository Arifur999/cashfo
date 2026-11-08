"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, ChevronDown, Pencil, Printer, Receipt, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import DayInput from "@/components/smartly/form/DayInput";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { GroupCashbookRow } from "@/lib/customer/api";
import { attempt, OFFLINE_MESSAGE, STALE_MESSAGE } from "@/lib/customer/attempt";
import { formatCurrency } from "@/lib/customer/currency";
import { countLabel, groupTabHref, shortName } from "@/lib/customer/groupDisplay";
import { deleteGroupHandoverAction } from "@/lib/customer/groupExpensesActions";
import { isAccountant, mainAccountantId } from "@/lib/customer/groupFamily";
import { type GroupPeriod, periodLabel } from "@/lib/customer/groupPeriod";
import { formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { groupLine, MemberAvatar } from "./GroupBits";
import { GroupPeriodPicker } from "./GroupPeriodPicker";
import { GroupStatement, type StatementSpec } from "./GroupStatement";
import { type HandoverDraft, HandoverDialog } from "./HandoverDialog";
import type { GroupPageData, GroupView } from "./groupTypes";

const PERIODS = ["month", "year", "all", "custom"] as const;
// #, date, accountant, from / spent on, note, in, out, cash in hand, actions.
const COLUMNS = "md:grid-cols-[32px_72px_140px_minmax(0,1fr)_minmax(0,1fr)_110px_110px_120px_76px]";

interface GroupCashbookTabProps {
  data: GroupPageData;
  view: GroupView;
  onPeriod: (period: GroupPeriod) => void;
  onAccountant: (id: string | null) => void;
  busy: boolean;
  // Whether new handovers may be added (not while paused, not by a
  // Viewer), which handovers may be changed (an Editor's own), and the
  // Editor's own record (they hand over only their own cash).
  canAdd: boolean;
  canTouch: (entry: { createdByUserId?: string | null }, date: string) => boolean;
  selfOnly: string | null;
}

// Each accountant's cash (the FamilyCashbook boards): money in from the
// deposits given to them, money out for the expenses they paid and what
// they returned, and cash handed from one holder to another (v16), with
// the cash in hand after each. Deposits and expenses are added on their own
// pages; handovers are added, edited and deleted here.
export function GroupCashbookTab({ data, view, onPeriod, onAccountant, busy, canAdd, canTouch, selfOnly }: GroupCashbookTabProps) {
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
  const period = data.period ?? { kind: "month" };
  const book = data.cashbook;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [printFrom, setPrintFrom] = useState("");
  const [printTo, setPrintTo] = useState("");
  const money = (value: number | string) => formatCurrency(Math.abs(Number(value)), currency, fmt);
  const accountants = book?.accountants ?? [];
  const chosenId = data.cashbookAccountant;
  const chosen = chosenId ? accountants.find((a) => a.groupMemberId === chosenId) : undefined;
  const names = accountants.map((a) => shortName(a.name));
  const together = names.length > 1 ? t("{first} and {second}", { first: names.slice(0, -1).join(", "), second: names[names.length - 1] }) : (names[0] ?? "");
  const who = chosen ? shortName(chosen.name) : names.length === 1 ? names[0] : t("the accountants");
  const closing = Number(book?.closing ?? 0);
  const rows = book?.rows ?? [];
  const opening = Number(book?.opening ?? 0);
  const memberOf = (id: string) => view.memberById[id];

  const kindText = (row: GroupCashbookRow) => (row.source === "HANDOVER" ? (row.kind === "IN" ? t("Handed in") : t("Handed out")) : row.kind === "IN" ? t("Received from member") : row.returned ? t("Returned to member") : t("Expense category"));
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h2 className="text-[19px] font-semibold text-ink">{t("Cash book · {period}", { period: periodLabel(period, data.today, startDay, t, fmt) })}</h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-baseline gap-2 text-small text-ink-muted">
            {t("Group cash in hand")}
            <b className={cn("text-[17px] font-bold tabular-nums", groupCash < -0.004 ? "text-warning" : "text-ink")}>
              {groupCash < -0.004 ? "− " : ""}
              {money(groupCash)}
            </b>
          </span>
          <Button variant="secondary" onClick={openPrint}>
            <Printer aria-hidden="true" />
            {t("Print statement")}
          </Button>
          {canAdd && holders.length > 1 && (!selfOnly || holders.some((member) => member.id === selfOnly)) && (
            <Button onClick={() => setHandover({ open: true, editing: null })}>
              <ArrowLeftRight aria-hidden="true" />
              {t("Hand over cash")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-haspopup="listbox" aria-label={t("Accountant")} className="flex h-12 items-center gap-2.5 rounded-xl border border-line bg-surface pr-3 pl-2 text-left hover:border-input">
              {chosen ? <MemberAvatar member={memberOf(chosen.groupMemberId) ?? { id: chosen.groupMemberId, name: chosen.name, photoUrl: null }} members={data.members} size={32} /> : <span className="flex size-8 items-center justify-center rounded-full bg-mint-50 text-caption font-bold text-brand-ink">{formatCount(accountants.length, fmt)}</span>}
              <span className="flex flex-col leading-tight">
                <span className="text-caption text-ink-muted">{t("Accountant")}</span>
                <span className="text-small font-semibold text-ink">{chosen ? chosen.name : t("All accountants")}</span>
              </span>
              <ChevronDown className="size-4 text-ink-muted" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={6} className="w-60 gap-1 rounded-xl border border-line-card bg-surface p-1.5 ring-0">
            <div role="listbox" aria-label={t("Accountants")} className="flex flex-col gap-0.5">
              {[null, ...accountants].map((option) => {
                const on = (option?.groupMemberId ?? null) === chosenId;
                return (
                  <button
                    key={option?.groupMemberId ?? "all"}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => {
                      setPickerOpen(false);
                      onAccountant(option?.groupMemberId ?? null);
                    }}
                    className={cn("flex h-10 items-center gap-2.5 rounded-lg px-2 text-left text-small", on ? "bg-emerald-soft font-semibold text-emerald" : "text-ink-2 hover:bg-surface-sunken")}
                  >
                    {option ? <MemberAvatar member={memberOf(option.groupMemberId) ?? { id: option.groupMemberId, name: option.name, photoUrl: null }} members={data.members} size={28} /> : <span className="size-7" />}
                    <span className="flex-1 truncate">{option ? option.name : t("All accountants")}</span>
                    {on && <Check className="size-4" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <Link href={groupTabHref(data.businessId, "members")} className="border-t border-line px-2 pt-2 pb-1 text-caption font-semibold text-emerald hover:text-emerald-hover">
              {t("Change accountants in Members")}
            </Link>
          </PopoverContent>
        </Popover>
        <GroupPeriodPicker value={period} options={PERIODS} today={data.today} startDay={startDay} onChange={onPeriod} busy={busy} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card padding="none" className="flex flex-col gap-1 px-5 py-4">
          <span className="text-small text-ink-muted">{t("Received from members")}</span>
          <span className="text-[24px] font-bold text-income tabular-nums">{money(book?.totalIn ?? 0)}</span>
          <span className="text-caption text-ink-muted">{countLabel(t, fmt, book?.inCount ?? 0, "{count} payment", "{count} payments")}</span>
        </Card>
        <Card padding="none" className="flex flex-col gap-1 px-5 py-4">
          <span className="text-small text-ink-muted">{chosen || names.length === 1 ? t("Spent by {name}", { name: who }) : t("Spent by accountants")}</span>
          <span className="text-[24px] font-bold text-expense tabular-nums">{money(book?.totalOut ?? 0)}</span>
          <span className="text-caption text-ink-muted">{countLabel(t, fmt, book?.outCount ?? 0, "{count} entry", "{count} entries")}</span>
        </Card>
        <Card padding="none" className={cn("flex flex-col gap-1 px-5 py-4", closing < 0 && "border-warning-line bg-warning-50")}>
          <span className="text-small text-ink-muted">{closing < 0 ? t("{name} spent from own pocket", { name: who }) : t("Cash in hand with {name}", { name: who })}</span>
          <span className={cn("text-[24px] font-bold tabular-nums", closing < 0 ? "text-warning" : "text-ink")}>{money(closing)}</span>
          <span className="text-caption text-ink-muted">{closing < 0 ? t("The group owes {name} this amount", { name: who }) : chosen || names.length === 1 ? t("Should be with {name} right now", { name: who }) : t("{names} together", { names: together })}</span>
        </Card>
      </div>

      <ListCard
        label={chosen ? t("{name}'s cash book", { name: chosen.name }) : t("All cash books")}
        header={
          <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 md:px-5">
            <h2 id="cb-title" className="text-title font-semibold text-ink">
              {chosen ? t("{name}'s cash book", { name: shortName(chosen.name) }) : together ? t("All cash books · {names}", { names: together }) : t("All cash books")}
            </h2>
            <span className="ml-auto flex flex-wrap items-center gap-2">
              {accountants
                .filter((a) => !chosen || a.groupMemberId === chosen.groupMemberId)
                .map((a) => {
                  const cash = Number(a.cash);
                  return (
                    <span key={a.groupMemberId} className={cn("flex items-center gap-2 rounded-full border py-1 pr-3 pl-1", cash < 0 ? "border-warning-line bg-warning-50" : "border-line bg-strip")}>
                      <MemberAvatar member={memberOf(a.groupMemberId) ?? { id: a.groupMemberId, name: a.name, photoUrl: null }} members={data.members} size={24} />
                      <span className="flex flex-col leading-tight">
                        <span className="text-[11px] text-ink-muted">{cash < 0 ? t("{name} paid extra", { name: shortName(a.name) }) : t("With {name}", { name: shortName(a.name) })}</span>
                        <span className={cn("text-caption font-bold tabular-nums", cash < 0 ? "text-warning" : "text-ink")}>
                          {cash < 0 ? "− " : ""}
                          {money(cash)}
                        </span>
                      </span>
                    </span>
                  );
                })}
            </span>
          </div>
        }
        footer={
          <ListFooter className="text-small text-ink-soft md:px-5">
            <span>
              {fillNodes(t("Money in comes from {contributions}, money out from {expenses}. Add entries there and they show up here."), {
                contributions: (
                  <Link href={groupTabHref(data.businessId, "contributions")} className="font-semibold text-emerald hover:underline">
                    {t("Contributions")}
                  </Link>
                ),
                expenses: (
                  <Link href={groupTabHref(data.businessId, "expenses")} className="font-semibold text-emerald hover:underline">
                    {t("Expenses")}
                  </Link>
                ),
              })}
            </span>
          </ListFooter>
        }
      >
        <ListHead columns={COLUMNS} className="gap-x-3 border-t md:px-5">
          <ListHeadCell>#</ListHeadCell>
          <ListHeadCell>{t("Date")}</ListHeadCell>
          <ListHeadCell>{t("Accountant")}</ListHeadCell>
          <ListHeadCell>{t("Received from / Spent on")}</ListHeadCell>
          <ListHeadCell>{t("Note")}</ListHeadCell>
          <ListHeadCell align="end">{t("In")}</ListHeadCell>
          <ListHeadCell align="end">{t("Out")}</ListHeadCell>
          <ListHeadCell align="end">{t("Cash in hand")}</ListHeadCell>
          <ListHeadCell align="end">{t("Actions")}</ListHeadCell>
        </ListHead>
        {rows.length > 0 && Math.abs(opening) >= 0.005 && (
          <ListRow columns={COLUMNS} className="min-h-10 gap-x-3 bg-strip text-small tabular-nums md:px-5">
            <ListCell className="hidden md:block" />
            <ListCell className="hidden md:block" />
            <ListCell className="font-semibold text-ink-2 md:col-span-4">{t("Opening balance")}</ListCell>
            <ListCell className="hidden md:block" />
            <ListCell align="end" className={cn("font-semibold", opening < 0 ? "text-warning" : "text-ink")}>
              {opening < 0 ? "− " : ""}
              {money(opening)}
            </ListCell>
            <ListCell className="hidden md:block" />
          </ListRow>
        )}
        {rows.length === 0 && <ListEmpty icon={<Receipt />} tone="neutral" title={period.kind === "month" ? t("No entries yet this month.") : t("No entries in this period.")} />}
        {rows.map((row, index) => {
          const balance = Number(row.balance);
          const into = row.kind === "IN";
          const draft = draftOf(row);
          return (
            <ListRow key={`${row.source}:${row.kind}:${row.id}`} columns={COLUMNS} className="min-h-12 grid-cols-[minmax(0,1fr)_auto_auto] gap-x-3 tabular-nums md:px-5 md:py-1">
              <ListCell className="hidden text-ink-muted md:block">{formatCount(index + 1, fmt)}</ListCell>
              <ListCell className="hidden text-ink-soft md:block">{formatDay(row.date, "d MMM", fmt)}</ListCell>
              <ListCell className="hidden items-center gap-2 md:flex">
                <MemberAvatar member={memberOf(row.accountantId) ?? { id: row.accountantId, name: row.accountantName ?? "?", photoUrl: null }} members={data.members} size={26} />
                <span className="truncate text-ink">{shortName(row.accountantName ?? "")}</span>
              </ListCell>
              <ListCell className="flex items-center gap-2.5">
                <span aria-hidden="true" className={cn("flex size-7 shrink-0 items-center justify-center rounded-full", draft ? "bg-surface-sunken text-ink-2" : into ? "bg-income-soft text-income" : "bg-expense-soft text-expense")}>
                  {draft ? <ArrowLeftRight className="size-3.5" /> : into ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate font-medium text-ink">{partyText(row)}</span>
                  <span className={cn("truncate text-[11.5px] font-medium", draft ? "text-ink-2" : into ? "text-income" : "text-expense")}>{kindText(row)}</span>
                  <span className="truncate text-caption text-ink-muted md:hidden">{[formatDay(row.date, "d MMM", fmt), row.accountantName && shortName(row.accountantName), row.note].filter(Boolean).join(" · ")}</span>
                </span>
              </ListCell>
              <ListCell className={cn("hidden truncate md:block", row.note ? "text-ink-2" : "text-input")}>{row.note || "—"}</ListCell>
              <ListCell align="end" className={cn("hidden md:block", into ? "font-semibold text-income" : "text-input")}>
                {into ? money(row.amount) : "—"}
              </ListCell>
              <ListCell align="end" className={cn("hidden md:block", !into ? "font-semibold text-expense" : "text-input")}>
                {!into ? money(row.amount) : "—"}
              </ListCell>
              <ListCell align="end" className="flex flex-col items-end">
                <span className={cn("font-bold", balance < 0 ? "text-warning" : "text-ink")}>
                  {balance < 0 ? "− " : ""}
                  {money(balance)}
                </span>
                <span className={cn("text-caption md:hidden", into ? "text-income" : "text-expense")}>
                  {into ? "+ " : "− "}
                  {money(row.amount)}
                </span>
              </ListCell>
              <ListCell className="flex justify-end gap-1.5">
                {draft ? (
                  canTouch(row, row.date) && (
                    <>
                      <button type="button" onClick={() => setHandover({ open: true, editing: draft })} aria-label={t("Edit handover")} className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                        <Pencil className="size-3.75" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => setRemoving(draft)} aria-label={t("Delete handover")} className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-expense-soft hover:text-expense pointer-coarse:size-11">
                        <Trash2 className="size-3.75" aria-hidden="true" />
                      </button>
                    </>
                  )
                ) : (
                  <Link href={groupTabHref(data.businessId, row.source === "EXPENSE" ? "expenses" : "contributions")} aria-label={row.source === "EXPENSE" ? t("Open in Expenses") : t("Open in Contributions")} className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11">
                    <ArrowUpRight className="size-3.75" aria-hidden="true" />
                  </Link>
                )}
              </ListCell>
            </ListRow>
          );
        })}
      </ListCard>

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
