"use client";

import { ArrowRight, Check, ChevronRight, Info, Lock, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowLink, ListTotalRow } from "@/components/smartly/list";
import LoadMore from "@/components/smartly/LoadMore";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { countLabel, dayLabel, paidIn, rangeLabel, recordDiffers, sharedCostEach, shiftMonth, throughManager, type Transfer } from "@/lib/customer/groupDisplay";
import { mealText } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { BalanceCell, Figure, SETTLE_UP_ID } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";

interface GroupSettlementTabProps {
  data: GroupPageData;
  view: GroupView;
  onRecordPayment: (transfer: Transfer) => void;
  onCloseMonth: () => void;
}

// A mess shows each member's meals, meal cost and shared cost; a family the
// costs. What each paid in is one "Paid in" column until the page is wide
// enough to split it into contributed, own pocket and returned.
const MESS_COLUMNS = "md:grid-cols-[minmax(0,1fr)_48px_92px_92px_100px_104px_112px]";
const MESS_WIDE = "2xl:grid-cols-[minmax(0,1fr)_48px_92px_92px_100px_96px_88px_88px_112px]";
const FAMILY_COLUMNS = "md:grid-cols-[minmax(0,1fr)_100px_104px_112px]";
const FAMILY_WIDE = "xl:grid-cols-[minmax(0,1fr)_100px_104px_96px_88px_112px]";
// Closed months shown before "Show more".
const HISTORY_PAGE = 6;
const HISTORY_ID = "group-closed-months";

type Route = "manager" | "direct";

// One member's line of the reckoning, live or from the closed record (which
// keeps no gross deposits or returns, only what was paid in).
interface Line {
  id: string;
  name: string;
  photoUrl: string | null | undefined;
  mealUnits: number;
  mealCost: number;
  otherShare: number;
  share: number;
  gross: number;
  pocket: number;
  returned: number;
  paidIn: number;
  balance: number;
}

// The board's month reckoning: who spent what -- meals, meal cost, shared
// cost, what each put in and paid from their pocket -- whether the account
// checks out, the payments that settle it (through the manager or member to
// member), and the months already closed.
export function GroupSettlementTab({ data, view, onRecordPayment, onCloseMonth }: GroupSettlementTabProps) {
  const { t, locale } = useLocale();
  const { currency, settlement, range, settings } = data;
  const month = monthName(range.key, locale);
  const nextMonth = monthName(shiftMonth(range.key, 1), locale);
  const meals = settings.kind === "MESS" || settings.mealsOn;
  const holder = settings.cashHolderMemberId ? view.memberById[settings.cashHolderMemberId] : undefined;
  const [route, setRoute] = useState<Route>(holder ? "manager" : "direct");
  const [historyLimit, setHistoryLimit] = useState(HISTORY_PAGE);
  const money = (value: number | string) => formatCurrency(value, currency);
  const dash = (value: number) => (Math.abs(value) < 0.005 ? <span className="text-ink-muted">—</span> : money(value));

  // A closed month whose entries changed since: its record and the live
  // figures no longer agree, and either can be shown.
  const record = data.closedRecord;
  const sameDays = !!record && record.periodStart.slice(0, 10) === range.from && record.periodEnd.slice(0, 10) === range.to;
  const differs = !!record && sameDays && recordDiffers(record, settlement);
  const [figures, setFigures] = useState<"live" | "record">("live");
  const lockedRecord = differs && figures === "record" ? record : null;
  const locked = lockedRecord !== null;

  const lines: Line[] = lockedRecord
    ? lockedRecord.members.map((row) => ({
        id: row.groupMemberId,
        name: row.groupMember?.name ?? view.memberById[row.groupMemberId]?.name ?? "—",
        photoUrl: row.groupMember?.photoUrl ?? view.memberById[row.groupMemberId]?.photoUrl,
        mealUnits: Number(row.mealUnits),
        mealCost: Number(row.mealCost),
        otherShare: Number(row.share) - Number(row.mealCost),
        share: Number(row.share),
        gross: Number(row.contributed),
        pocket: Number(row.pocketPaid),
        returned: 0,
        paidIn: paidIn(row),
        balance: Number(row.balance),
      }))
    : settlement.members.map((row) => ({
        id: row.groupMemberId,
        name: row.name,
        photoUrl: view.memberById[row.groupMemberId]?.photoUrl,
        mealUnits: Number(row.mealUnits),
        mealCost: Number(row.mealCost),
        otherShare: Number(row.otherShare),
        share: Number(row.share),
        gross: Number(row.grossDeposited),
        pocket: Number(row.pocketPaid),
        returned: Number(row.returned),
        paidIn: paidIn(row),
        balance: Number(row.balance),
      }));
  const sum = (pick: (line: Line) => number) => lines.reduce((total, line) => total + pick(line), 0);
  const totals = { meals: sum((l) => l.mealUnits), mealCost: sum((l) => l.mealCost), shared: sum((l) => l.otherShare), cost: sum((l) => l.share), gross: sum((l) => l.gross), pocket: sum((l) => l.pocket), returned: sum((l) => l.returned), paidIn: sum((l) => l.paidIn), balance: sum((l) => l.balance) };
  // The record keeps no split of what was paid in, so it always shows the one column.
  const split = !locked;
  const columns = cn(meals ? MESS_COLUMNS : FAMILY_COLUMNS, split && (meals ? MESS_WIDE : FAMILY_WIDE));
  const paidInCell = !split ? "hidden md:block" : meals ? "hidden md:block 2xl:hidden" : "hidden md:block xl:hidden";
  const splitCell = meals ? "hidden 2xl:block" : "hidden xl:block";

  // The figures above the table and its subline follow the rows: the closed
  // record's when that is picked, else the live ones.
  const shown = lockedRecord ?? settlement;
  const shownCash = lockedRecord ? Number(lockedRecord.cashInHand) : view.cash;
  const sharedCost = Number(shown.totalExpense) - Number(shown.mealExpense);
  // One figure only when everyone pays it: costs split equally, nobody joining mid-month.
  const equal = view.sharedEqually;
  const payments = route === "manager" && holder ? throughManager(settlement.members, holder.id) : view.transfers.map((transfer) => ({ ...transfer, owes: false }));
  const managerLeft = holder ? Number(settlement.members.find((r) => r.groupMemberId === holder.id)?.balance ?? 0) : 0;
  const history = [...data.history].sort((a, b) => b.periodStart.localeCompare(a.periodStart));

  return (
    <div className="flex flex-col gap-5">
      <Card padding="none" className="flex flex-wrap items-center gap-5 px-5 py-3">
        <Figure label={t("Total expense")} value={money(shown.totalExpense)} />
        {meals ? (
          <>
            <Figure label={t("Meals")} value={mealText(Number(shown.mealUnits), locale)} />
            <Figure label={t("Meal rate")} value={money(shown.mealRate)} tone="text-emerald" />
          </>
        ) : (
          <Figure label={t("Members")} value={formatCount(shown.memberCount, locale)} />
        )}
        <Figure label={t("Shared cost each")} value={equal ? money(sharedCostEach(shown)) : "—"} tone={equal && !meals ? "text-emerald" : "text-ink"} />
        <Figure label={t("Cash in hand")} value={money(shownCash)} tone={shownCash < 0 ? "text-expense" : "text-ink"} divided={false} />
        {locked && (
          <span className="flex items-center gap-1.5 text-caption font-semibold text-ink-2">
            <Lock className="size-3.5" aria-hidden="true" />
            {t("Closed record")}
          </span>
        )}
        <span className="flex-1" />
        {view.closed ? (
          <span className="flex items-center gap-2 text-small font-semibold text-ink-2">
            <Lock className="size-4" aria-hidden="true" />
            {t("{month} is closed", { month })}
          </span>
        ) : (
          <Button variant="action" onClick={onCloseMonth} disabled={settlement.members.length === 0}>
            <Lock />
            {t("Close {month}", { month })}
          </Button>
        )}
      </Card>

      {differs && record && (
        <Banner tone="warning" inline icon={<TriangleAlert />}>
          {t("Changed since {month} was closed: the locked record says {spent} spent, {cash} cash.", { month, spent: money(record.totalExpense), cash: money(record.cashInHand) })}
        </Banner>
      )}

      {/* A mess's table scrolls sideways, so it is a tab stop: the arrow keys reach its clipped columns. */}
      <ListCard
        label={t("Who spent what")}
        tableClassName={meals ? "overflow-x-auto" : undefined}
        scrollable={meals}
        header={
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-4 md:px-6">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="text-title font-semibold text-ink">
                {t("Who spent what")} · {rangeLabel(range, locale)}
              </h2>
              <span className="text-small text-ink-muted">
                {meals && `${t("Meal cost = meals × {rate}", { rate: money(shown.mealRate) })} · `}
                {equal ? t("shared cost = {amount} ÷ {count}", { amount: money(sharedCost), count: formatCount(shown.memberCount, locale) }) : t("Each cost is shared the way its expense says.")}
              </span>
            </div>
            {differs && (
              <SegmentedControl<"live" | "record">
                options={[
                  { value: "live", label: "Live figures" },
                  { value: "record", label: "Closed record" },
                ]}
                value={figures}
                onChange={setFigures}
                label="Figures to show"
                variant="soft"
              />
            )}
          </div>
        }
        footer={
          lines.length > 0 &&
          (lockedRecord ? (
            <ListFooter className="flex-row items-center gap-3 text-ink-2">
              <Lock className="size-4 shrink-0" aria-hidden="true" />
              <span>{t("The record as {month} was closed on {date}.", { month, date: dayLabel(formatDate(lockedRecord.closedAt, "yyyy-MM-dd"), locale, true) })}</span>
            </ListFooter>
          ) : (
            <div className={cn("flex items-center gap-3 border-t px-4 py-3 text-small md:px-6", view.cash < 0 ? "border-expense-soft bg-expense-soft text-expense" : "border-mint-50 bg-mint-50 text-brand-ink")}>
              {view.cash < 0 ? <Info className="size-4 shrink-0" aria-hidden="true" /> : <Check className="size-4 shrink-0" aria-hidden="true" />}
              <span>
                <b className="font-semibold">{view.cash < 0 ? t("More was spent than came in.") : t("The account checks out.")}</b>{" "}
                {t("Balances add up to {cash}, exactly the cash {holder} should hold: {contributed} contributed − {spent} spent from the fund.", {
                  cash: formatSignedCurrency(view.cash, currency),
                  holder: holder?.name ?? t("the fund"),
                  contributed: money(totals.gross - totals.returned),
                  spent: money(Number(settlement.totalExpense) - totals.pocket),
                })}
              </span>
            </div>
          ))
        }
      >
        {/* Wide enough that a sideways-scrolling mess table still gives the name 140px. */}
        <div role="rowgroup" className={cn(meals && "md:min-w-202", meals && split && "2xl:min-w-250")}>
          <ListHead columns={columns} className={cn("items-end", meals && "gap-x-3")}>
            <ListHeadCell>{t("Member")}</ListHeadCell>
            {meals && (
              <>
                <ListHeadCell align="end">{t("Meals")}</ListHeadCell>
                <ListHeadCell align="end">{t("Meal cost")}</ListHeadCell>
                <ListHeadCell align="end">{t("Shared cost")}</ListHeadCell>
              </>
            )}
            <ListHeadCell align="end" className="font-semibold text-ink-2">
              {t("Total cost")}
            </ListHeadCell>
            <ListHeadCell align="end" className={paidInCell}>
              {t("Paid in")}
            </ListHeadCell>
            {split && (
              <>
                <ListHeadCell align="end" className={splitCell}>
                  {t("Contributed")}
                </ListHeadCell>
                <ListHeadCell align="end" className={splitCell}>
                  {t("Own pocket")}
                </ListHeadCell>
                <ListHeadCell align="end" className={splitCell}>
                  {t("Returned")}
                </ListHeadCell>
              </>
            )}
            <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
          </ListHead>
          {lines.length === 0 && <ListEmpty title={t("Add members to see the settlement.")} />}
          {lines.map((line) => (
            <ListRow key={line.id} columns={columns} className={cn("tabular-nums", meals && "gap-x-3")}>
              <ListCell className="flex items-center gap-3 font-medium text-ink">
                <PersonAvatar name={line.name} src={line.photoUrl} size={30} coloured />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{line.name}</span>
                  <span className="truncate text-caption font-normal text-ink-muted md:hidden">{t("{paid} paid in · {cost} cost", { paid: money(line.paidIn), cost: money(line.share) })}</span>
                </span>
              </ListCell>
              {meals && (
                <>
                  <ListCell align="end" className="hidden text-ink-2 md:block">
                    {mealText(line.mealUnits, locale)}
                  </ListCell>
                  <ListCell align="end" className="hidden text-ink-2 md:block">
                    {money(line.mealCost)}
                  </ListCell>
                  <ListCell align="end" className="hidden text-ink-2 md:block">
                    {money(line.otherShare)}
                  </ListCell>
                </>
              )}
              <ListCell align="end" className="hidden font-semibold text-ink md:block">
                {money(line.share)}
              </ListCell>
              <ListCell align="end" className={cn(paidInCell, "text-ink")}>
                {money(line.paidIn)}
              </ListCell>
              {split && (
                <>
                  <ListCell align="end" className={cn(splitCell, "text-ink")}>
                    {money(line.gross)}
                  </ListCell>
                  <ListCell align="end" className={cn(splitCell, line.pocket > 0 ? "text-income" : "text-ink-muted")}>
                    {dash(line.pocket)}
                  </ListCell>
                  <ListCell align="end" className={cn(splitCell, "text-ink-muted")}>
                    {dash(line.returned)}
                  </ListCell>
                </>
              )}
              <ListCell>
                <BalanceCell stacked value={line.balance} currency={currency} />
              </ListCell>
            </ListRow>
          ))}
          {lines.length > 0 && (
            <ListTotalRow columns={columns} className={cn("tabular-nums", meals && "gap-x-3")}>
              <span role="cell">{t("Total")}</span>
              {meals && (
                <>
                  <span role="cell" className="hidden text-right md:block">
                    {mealText(totals.meals, locale)}
                  </span>
                  <span role="cell" className="hidden text-right md:block">
                    {money(totals.mealCost)}
                  </span>
                  <span role="cell" className="hidden text-right md:block">
                    {money(totals.shared)}
                  </span>
                </>
              )}
              <span role="cell" className="hidden text-right md:block">
                {money(totals.cost)}
              </span>
              <span role="cell" className={cn(paidInCell, "text-right")}>
                {money(totals.paidIn)}
              </span>
              {split && (
                <>
                  <span role="cell" className={cn(splitCell, "text-right")}>
                    {money(totals.gross)}
                  </span>
                  <span role="cell" className={cn(splitCell, "text-right")}>
                    {money(totals.pocket)}
                  </span>
                  <span role="cell" className={cn(splitCell, "text-right")}>
                    {money(totals.returned)}
                  </span>
                </>
              )}
              <span role="cell" className={cn("text-right", totals.balance < 0 ? "text-expense" : "text-income")}>
                {formatSignedCurrency(locked ? totals.balance : view.cash, currency)}
              </span>
            </ListTotalRow>
          )}
        </div>
      </ListCard>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-4">
            {/* "Record payments first" in the close dialog brings focus here. */}
            <h2 id={SETTLE_UP_ID} tabIndex={-1} className="scroll-mt-4 rounded-sm text-title font-semibold text-ink">
              {t("Settle up")}
            </h2>
            {holder ? (
              <SegmentedControl<Route>
                options={[
                  { value: "manager", label: "Through the manager" },
                  { value: "direct", label: "Member to member" },
                ]}
                value={route}
                onChange={setRoute}
                label="How to settle"
                variant="soft"
              />
            ) : (
              <span className="text-small text-ink-muted">{t("Member to member")}</span>
            )}
          </div>
          {payments.length === 0 && <p className="px-5 py-6 text-center text-small text-ink-muted">{settlement.members.length === 0 ? t("Nothing to settle yet.") : t("Everyone is even. Nothing to settle.")}</p>}
          {payments.map((payment) => {
            const from = view.memberById[payment.fromId];
            const to = view.memberById[payment.toId];
            const note = route === "manager" ? (payment.owes ? "pays the manager" : "returns from the cash") : "pays directly";
            return (
              <div key={`${payment.fromId}-${payment.toId}`} className="flex min-h-13.5 flex-wrap items-center gap-x-3 gap-y-2 border-b border-divider px-5 py-2 text-body">
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <PersonAvatar name={from?.name ?? "?"} src={from?.photoUrl} size={28} coloured />
                  <span className="font-medium text-ink">{from?.name}</span>
                  <ArrowRight className="size-4 text-ink-muted" aria-hidden="true" />
                  <PersonAvatar name={to?.name ?? "?"} src={to?.photoUrl} size={28} coloured />
                  <span className="font-medium text-ink">{to?.name}</span>
                  <span className="text-caption font-normal text-ink-muted">{t(note)}</span>
                </span>
                <span className="font-bold text-ink tabular-nums">{money(payment.amount)}</span>
                {!view.closed && (
                  <Button variant="secondary" size="sm" onClick={() => onRecordPayment({ fromId: payment.fromId, toId: payment.toId, amount: payment.amount })} className="h-8 px-3 pointer-coarse:h-11">
                    {t("Record payment")}
                  </Button>
                )}
              </div>
            );
          })}
          <div className="flex items-start gap-2 bg-strip px-5 py-3 text-small leading-relaxed text-ink-2">
            <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <span>
              {payments.length === 0
                ? t("A payment is saved as two entries: a deposit by the payer and a return to the receiver.")
                : route === "manager" && holder
                  ? t("After these payments everyone else is at {zero}, and the {left} left with {holder} is {holder}'s own balance. Or skip them and carry the balances into {month} when you close.", { zero: money(0), left: money(managerLeft), holder: holder.name, month: nextMonth })
                  : t("After these payments everyone is at {zero}. Or skip them and carry the balances into {month} when you close.", { zero: money(0), month: nextMonth })}
            </span>
          </div>
        </Card>

        <ListCard
          id={HISTORY_ID}
          label={t("Closed months")}
          header={
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-4 py-4 md:px-6">
              <h2 className="text-title font-semibold text-ink">{t("Closed months")}</h2>
              <span className="text-caption font-normal text-ink-muted">{t("Locked, they never change")}</span>
            </div>
          }
          footer={
            history.length > HISTORY_PAGE && (
              <ListFooter>
                <LoadMore shown={Math.min(historyLimit, history.length)} total={history.length} step={HISTORY_PAGE} onMore={() => setHistoryLimit(historyLimit + HISTORY_PAGE)} onLess={historyLimit > HISTORY_PAGE ? () => setHistoryLimit(HISTORY_PAGE) : undefined} focusTargetId={HISTORY_ID} />
              </ListFooter>
            )
          }
        >
          {history.length === 0 && <ListEmpty title={t("No month closed yet.")} className="py-6 text-small" />}
          {history.slice(0, historyLimit).map((closed) => {
            const key = closed.periodStart.slice(0, 7);
            const people = countLabel(t, locale, closed.memberCount, "{count} member", "{count} members");
            return (
              <ListRow key={closed.id} className="grid-cols-[32px_minmax(0,1fr)_16px] gap-x-3 md:grid-cols-[32px_minmax(0,1fr)_16px]">
                <ListCell>
                  <span className="flex size-8 items-center justify-center rounded-md bg-surface-sunken text-ink-2">
                    <Lock className="size-4" aria-hidden="true" />
                  </span>
                </ListCell>
                <ListCell className="flex flex-col gap-0.5">
                  <span className="flex justify-between gap-3 text-body font-semibold">
                    <ListRowLink href={{ pathname: `/group-expenses/${data.businessId}`, query: { tab: "settlement", month: key } }} className="truncate">
                      {monthName(key, locale, "long", true)}
                    </ListRowLink>
                    <span className="shrink-0 tabular-nums">{money(closed.totalExpense)}</span>
                  </span>
                  <span className="text-caption font-normal text-ink-muted">
                    {t("Closed {date}", { date: dayLabel(formatDate(closed.closedAt, "yyyy-MM-dd"), locale, true) })}
                    {closed.carriedForward ? ` · ${t("balances carried forward")}` : ""}
                  </span>
                  {/* No "each" figure: the record can't tell whether that month's costs were shared equally. */}
                  <span className="text-caption font-normal text-ink-2 tabular-nums">
                    {Number(closed.mealUnits) > 0 ? `${t("{meals} meals", { meals: mealText(Number(closed.mealUnits), locale) })} · ${t("{rate} a meal", { rate: money(closed.mealRate) })} · ${people}` : people}
                  </span>
                </ListCell>
                <ListCell>
                  <ChevronRight className="size-4 text-ink-muted" aria-hidden="true" />
                </ListCell>
              </ListRow>
            );
          })}
        </ListCard>
      </div>
    </div>
  );
}
