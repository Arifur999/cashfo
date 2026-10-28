"use client";

import { MessageCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import { ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GroupMember } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { countLabel, dayLabel, expenseShare, mealRateText, paidIn, shortName, SPLIT_LABELS, splitText, splitTotals } from "@/lib/customer/groupDisplay";
import { mealText } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { formatCount, toLocaleDigits } from "@/lib/i18n/digits";
import { type FormatLocale, langOf } from "@/lib/i18n/formatPrefs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CloseX, MemberAvatar } from "./GroupBits";
import type { GroupPageData, GroupView } from "./groupTypes";

interface MemberStatementDrawerProps {
  open: boolean;
  onClose: () => void;
  data: GroupPageData;
  view: GroupView;
  member: GroupMember | null;
  onRecordPayment: () => void;
}

interface Entry {
  date: string;
  title: string;
  sub: string;
  amount: number;
}

// Date, entry, amount, running balance; a phone keeps the entry and the
// figures, the date going under the entry's name.
const COLUMNS = "md:grid-cols-[52px_minmax(0,1fr)_96px_88px]";

// "01 Sep", as the statement's date column writes a day.
const listDay = (day: string, locale: FormatLocale) => (langOf(locale) === "en" ? toLocaleDigits(dayLabel(day, "en").padStart(6, "0"), locale) : dayLabel(day, locale));

// One member's month: what they paid in, what they paid from their own
// pocket, their part of each cost (as the expense is shared), their meals,
// and where that leaves them. Sent on WhatsApp as text, or printed.
export function MemberStatementDrawer({ open, onClose, data, view, member, onRecordPayment }: MemberStatementDrawerProps) {
  const { t, locale, fmt } = useLocale();
  const wide = useMediaQuery("(min-width: 768px)");
  const { currency, range } = data;
  const monthLabel = monthName(range.key, fmt, "long", true);
  const row = member ? data.settlement.members.find((r) => r.groupMemberId === member.id) : undefined;
  const memberCount = data.settlement.memberCount || view.activeMembers.length || 1;
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const holder = data.settings.cashHolderMemberId ? view.memberById[data.settings.cashHolderMemberId] : undefined;

  const entries: Entry[] = member
    ? [
        ...data.contributions
          .filter((c) => c.groupMemberId === member.id)
          .map((c) => {
            const amount = Number(c.amount);
            return { date: c.date.slice(0, 10), title: t(c.kind === "SETTLE" ? "Settle up" : c.kind === "CARRY" ? "Carried over" : amount < 0 ? "Return" : "Contribution"), sub: c.note || (holder && amount > 0 ? t("Cash to {name}", { name: shortName(holder.name) }) : t(amount < 0 ? "Cash from the fund" : "Cash to the fund")), amount };
          }),
        ...data.expenses.filter((e) => e.paidFrom === "MEMBER" && e.paidByMemberId === member.id).map((e) => ({ date: e.date.slice(0, 10), title: t("{category} from own pocket", { category: e.category }), sub: e.description || t("Paid from own pocket"), amount: Number(e.amount) })),
        ...data.expenses
          .map((e) => ({ e, share: expenseShare(e, member.id, data.members, data.range, view.mealsPooled) }))
          .filter(({ share }) => Math.abs(share) > 0.004)
          .map(({ e, share }) => {
            const how = splitText(e, data.members);
            return { date: e.date.slice(0, 10), title: t("{category} share", { category: e.category }), sub: `${money(e.amount)} · ${how.only ? t("Only {name}", { name: how.only }) : `${t(SPLIT_LABELS[how.kind])}${how.detail ? ` ${toLocaleDigits(how.detail, fmt)}` : ""}`}${e.description ? ` · ${e.description}` : ""}`, amount: -share };
          }),
        // Meals are charged once, at the month's rate.
        ...(row && Number(row.mealCost) > 0 ? [{ date: range.to, title: t("Meals"), sub: t("{meals} meals × {rate}", { meals: mealText(Number(row.mealUnits), fmt), rate: mealRateText(data.settlement.mealRate, currency, fmt) }), amount: -Number(row.mealCost) }] : []),
      ].sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const lines = entries.reduce<(Entry & { balance: number })[]>((acc, entry) => {
    const balance = (acc[acc.length - 1]?.balance ?? 0) + entry.amount;
    return [...acc, { ...entry, balance }];
  }, []);

  const deposits = member ? data.contributions.filter((c) => c.groupMemberId === member.id && Number(c.amount) > 0).length : 0;
  const gross = row ? Number(row.grossDeposited) : 0;
  const returned = row ? Number(row.returned) : 0;
  const pocket = row ? Number(row.pocketPaid) : 0;
  const share = row ? Number(row.share) : 0;
  const balance = row ? Number(row.balance) : 0;
  const owes = balance < -0.004;
  const even = Math.abs(balance) < 0.005;
  const depositsLine = countLabel(t, fmt, deposits, "{count} deposit", "{count} deposits");

  // What came from their pocket, and when: "Bazar on 12 Sep", or how many.
  const pocketRows = member ? data.expenses.filter((e) => e.paidFrom === "MEMBER" && e.paidByMemberId === member.id) : [];
  const pocketSub = pocketRows.length === 0 ? "—" : pocketRows.length === 1 ? t("{category} on {day}", { category: pocketRows[0].category, day: dayLabel(pocketRows[0].date, fmt) }) : countLabel(t, fmt, pocketRows.length, "{count} payment", "{count} payments");
  const meals = !!row && Number(row.mealCost) > 0;
  const byShares = member ? (splitTotals(data.expenses, "SHARES", data.members, range, view.mealsPooled)[member.id] ?? 0) : 0;
  const totalUnits = view.activeMembers.reduce((sum, m) => sum + Number(m.shareUnits), 0);
  // The costs everyone shares, named by their first categories: "Rent, Utility ÷ 5".
  const sharedNames = [...new Set(data.expenses.filter((e) => !(e.split === "MEALS" && view.mealsPooled) && e.split !== "SHARES").map((e) => e.category))].slice(0, 2).join(", ");
  const sharedCost = (row ? Number(row.otherShare) : 0) - (meals ? 0 : byShares);

  const summary = [
    { label: t("Contributed"), value: money(gross), sub: returned > 0 ? `${depositsLine} · ${t("{amount} returned", { amount: money(returned) })}` : depositsLine, tone: "text-emerald" },
    { label: t("Own pocket"), value: money(pocket), sub: pocketSub, tone: pocket > 0 ? "text-emerald" : "text-ink" },
    meals
      ? { label: t("Meals"), value: money(row?.mealCost ?? 0), sub: `${mealText(Number(row?.mealUnits ?? 0), fmt)} × ${mealRateText(data.settlement.mealRate, currency, fmt)}`, tone: "text-ink" }
      : { label: t("By shares"), value: money(byShares), sub: member ? t("{units} of {total} shares", { units: mealText(Number(member.shareUnits), fmt), total: mealText(totalUnits, fmt) }) : "—", tone: "text-ink" },
    { label: t("Shared costs"), value: money(sharedCost), sub: view.sharedEqually && sharedNames ? `${sharedNames} ÷ ${formatCount(memberCount, fmt)}` : t("As each expense is shared"), tone: "text-ink" },
  ];

  function statementText(): string {
    if (!member) return "";
    const head = `${data.name} · ${monthLabel}\n${member.name}\n`;
    const body = lines.map((l) => `${dayLabel(l.date, fmt, true)}  ${l.title}  ${formatSignedCurrency(l.amount, currency, fmt)}`).join("\n");
    const foot = `\n${t("Balance")}: ${formatSignedCurrency(balance, currency, fmt)} (${even ? t("Settled") : owes ? t("Has to pay") : t("Gets back")})`;
    return `${head}\n${body}\n${foot}`;
  }

  function sendWhatsApp() {
    const digits = (member?.phone ?? "").replace(/\D/g, "");
    const to = digits ? (digits.startsWith("880") ? digits : `880${digits.replace(/^0/, "")}`) : "";
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(statementText())}`, "_blank", "noopener");
  }

  // Opened without "noopener" (which makes window.open return null, so
  // nothing could be written into it), then cut loose from this page.
  function print() {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) {
      toast.error(t("Allow pop-ups to print"));
      return;
    }
    w.opener = null;
    const escape = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
    w.document.write(`<!doctype html><html lang="${locale}"><title>${escape(member?.name ?? "")} · ${escape(monthLabel)}</title><pre style="font: 14px/1.5 system-ui, sans-serif; padding: 24px; white-space: pre-wrap">${escape(statementText())}</pre></html>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-135 shadow-drawer data-[side=right]:sm:max-w-135" : "rounded-t-xl data-[side=bottom]:h-[92vh]")}>
        <SheetHeader className={cn("flex-row items-center gap-3 space-y-0", wide ? "border-b border-line px-6 py-4" : "px-4 pt-4 pb-2")}>
          {member && <MemberAvatar member={member} members={data.members} size={40} className="text-small" />}
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <SheetTitle className="truncate text-h3 text-ink">{member?.name}</SheetTitle>
            <span className="text-small leading-normal text-ink-muted">{t("{group} · {month} statement", { group: data.name, month: monthLabel })}</span>
          </div>
          <CloseX onClick={onClose} className="rounded-full" />
        </SheetHeader>

        <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-4" : "px-4 py-3")}>
          <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-field border border-line md:grid-cols-4">
            {summary.map((cell, i) => (
              <div key={cell.label} className={cn("flex min-w-0 flex-col gap-0.5 px-3 py-2.5", i < summary.length - 1 && "md:border-r md:border-line", i % 2 === 0 && "max-md:border-r max-md:border-line", i < 2 && "max-md:border-b max-md:border-line")}>
                <span className="text-caption font-normal text-ink-muted">{cell.label}</span>
                <span className={cn("text-[17px] leading-normal font-bold tabular-nums", cell.tone)}>{cell.value}</span>
                <span className="truncate text-caption font-normal text-ink-muted" title={cell.sub}>
                  {cell.sub}
                </span>
              </div>
            ))}
          </div>

          <div className={cn("flex shrink-0 items-center justify-between gap-3 rounded-field border px-4 py-3", even ? "border-line bg-strip" : owes ? "border-expense/25 bg-expense-soft" : "border-mint-200 bg-mint-50")}>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className={cn("text-small font-semibold", even ? "text-ink" : owes ? "text-expense" : "text-income")}>{even ? t("Settled") : owes ? t("Has to pay") : t("Gets back")}</span>
              {/* What they put in counts their own-pocket payments too, as their balance does. */}
              <span className={cn("text-caption font-normal tabular-nums", even ? "text-ink-muted" : owes ? "text-expense" : "text-income")}>{t("{paid} paid in − {cost} cost", { paid: money(row ? paidIn(row) : 0), cost: money(share) })}</span>
            </div>
            <span className={cn("text-[26px] leading-normal font-bold tracking-[-0.02em] tabular-nums", even ? "text-ink" : owes ? "text-expense" : "text-income")}>{formatSignedCurrency(balance, currency, fmt)}</span>
          </div>

          <ListCard label={t("{name}'s statement", { name: member?.name ?? "" })} elevated={false} className="shrink-0 rounded-field">
            <ListHead columns={COLUMNS} className="gap-x-3 md:px-3.5">
              <ListHeadCell>{t("Date")}</ListHeadCell>
              <ListHeadCell>{t("Entry")}</ListHeadCell>
              <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
              <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
            </ListHead>
            {lines.length === 0 && <ListEmpty title={t("Nothing recorded for this member yet.")} className="py-6 text-small" />}
            {lines.map((line, i) => (
              <ListRow key={i} columns={COLUMNS} density="dense" className="gap-x-3 text-small tabular-nums md:px-3.5 md:py-1.5">
                <ListCell className="hidden text-body text-ink-soft md:block">{listDay(line.date, fmt)}</ListCell>
                <ListCell className="flex flex-col">
                  <span className="truncate font-medium text-ink">{line.title}</span>
                  <span className="truncate text-caption font-normal text-ink-muted">
                    <span className="md:hidden">{dayLabel(line.date, fmt)} · </span>
                    {line.sub}
                  </span>
                </ListCell>
                <ListCell align="end" className="flex flex-col items-end">
                  <span className={cn("text-body font-semibold", line.amount > 0 ? "text-income" : "text-ink")}>{formatSignedCurrency(line.amount, currency, fmt)}</span>
                  <span className={cn("text-caption md:hidden", line.balance < -0.004 ? "text-expense" : "text-ink-muted")}>{formatSignedCurrency(line.balance, currency, fmt)}</span>
                </ListCell>
                <ListCell align="end" className={cn("hidden text-body md:block", line.balance < -0.004 ? "text-expense" : "text-ink-2")}>
                  {line.balance < -0.004 ? formatSignedCurrency(line.balance, currency, fmt) : money(line.balance)}
                </ListCell>
              </ListRow>
            ))}
          </ListCard>
          <span className="text-caption font-normal leading-normal text-ink-muted">{meals ? t("The meal cost uses this month's rate, {rate}. It only changes if more bazar or meals are added before {month} is closed.", { rate: mealRateText(data.settlement.mealRate, currency, fmt), month: monthName(range.key, fmt) }) : t("Each cost is shared the way its expense says, among the members there that day. The shares change if more is recorded before the month is closed.")}</span>
        </div>

        <div className={cn("flex flex-wrap items-center gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 py-3")}>
          {/* Icons alone on a phone, their words kept for screen readers. */}
          <Button type="button" variant="secondary" onClick={sendWhatsApp} disabled={!member} className="max-sm:w-10 max-sm:px-0">
            <MessageCircle />
            <span className="max-sm:sr-only">{t("Send on WhatsApp")}</span>
          </Button>
          <Button type="button" variant="secondary" onClick={print} disabled={!member} className="max-sm:w-10 max-sm:px-0">
            <Printer />
            <span className="max-sm:sr-only">{t("Print")}</span>
          </Button>
          <span className="flex-1" />
          {/* A closed month takes no new payment here, as on Settlement. */}
          {!even && !view.closed && (
            <Button type="button" variant="action" onClick={onRecordPayment} className="px-4.5">
              {t("Record a payment")}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
