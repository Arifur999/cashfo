"use client";

import { MessageCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import { ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GroupMember } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { countLabel, dayLabel, expenseShare, paidIn, SPLIT_LABELS, splitText } from "@/lib/customer/groupDisplay";
import { mealText } from "@/lib/customer/groupMeals";
import { monthName } from "@/lib/customer/insights";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CloseX } from "./GroupBits";
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
const COLUMNS = "md:grid-cols-[56px_minmax(0,1fr)_96px_96px]";

// One member's month: what they paid in, what they paid from their own
// pocket, their part of each cost (as the expense is shared), their meals,
// and where that leaves them. Sent on WhatsApp as text, or printed.
export function MemberStatementDrawer({ open, onClose, data, view, member, onRecordPayment }: MemberStatementDrawerProps) {
  const { t, locale } = useLocale();
  const wide = useMediaQuery("(min-width: 768px)");
  const { currency, range } = data;
  const monthLabel = monthName(range.key, locale, "long", true);
  const row = member ? data.settlement.members.find((r) => r.groupMemberId === member.id) : undefined;
  const memberCount = data.settlement.memberCount || view.activeMembers.length || 1;
  const money = (value: number | string) => formatCurrency(value, currency);

  const entries: Entry[] = member
    ? [
        ...data.contributions
          .filter((c) => c.groupMemberId === member.id)
          .map((c) => {
            const amount = Number(c.amount);
            return { date: c.date.slice(0, 10), title: t(c.kind === "SETTLE" ? "Settle up" : c.kind === "CARRY" ? "Carried over" : amount < 0 ? "Return" : "Deposit"), sub: c.note ?? t(amount < 0 ? "Cash from the fund" : "Cash to the fund"), amount };
          }),
        ...data.expenses.filter((e) => e.paidFrom === "MEMBER" && e.paidByMemberId === member.id).map((e) => ({ date: e.date.slice(0, 10), title: t("Paid from own pocket"), sub: [e.category, e.description].filter(Boolean).join(" · "), amount: Number(e.amount) })),
        ...data.expenses
          .map((e) => ({ e, share: expenseShare(e, member.id, data.members, data.range, view.mealsPooled) }))
          .filter(({ share }) => Math.abs(share) > 0.004)
          .map(({ e, share }) => {
            const how = splitText(e, data.members);
            return { date: e.date.slice(0, 10), title: t("{category} share", { category: e.category }), sub: `${money(e.amount)} · ${how.only ? t("Only {name}", { name: how.only }) : `${t(SPLIT_LABELS[how.kind])}${how.detail ? ` ${how.detail}` : ""}`}${e.description ? ` · ${e.description}` : ""}`, amount: -share };
          }),
        // Meals are charged once, at the month's rate.
        ...(row && Number(row.mealCost) > 0 ? [{ date: range.to, title: t("Meals"), sub: `${mealText(Number(row.mealUnits), locale)} × ${money(data.settlement.mealRate)}`, amount: -Number(row.mealCost) }] : []),
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
  const depositsLine = countLabel(t, locale, deposits, "{count} deposit", "{count} deposits");

  const summary = [
    { label: t("Contributed"), value: money(gross), sub: pocket > 0 ? `${depositsLine} · ${t("{amount} from own pocket", { amount: money(pocket) })}` : depositsLine, tone: "text-income" },
    { label: t("Returned"), value: money(returned), sub: returned > 0 ? t("paid back") : "—", tone: "text-ink" },
    {
      label: t("Share of costs"),
      value: money(share),
      sub: row && Number(row.mealCost) > 0 ? t("{meals} meals + {shared} shared", { meals: money(row.mealCost), shared: money(row.otherShare) }) : view.sharedEqually ? `${money(Number(data.settlement.totalExpense) - Number(data.settlement.mealExpense))} ÷ ${formatCount(memberCount, locale)}` : t("As each expense is shared"),
      tone: "text-ink",
    },
    { label: t("Balance"), value: formatSignedCurrency(balance, currency), sub: even ? t("Settled") : owes ? t("Has to pay") : t("Gets back"), tone: even ? "text-ink" : owes ? "text-expense" : "text-income" },
  ];

  function statementText(): string {
    if (!member) return "";
    const head = `${data.name} · ${monthLabel}\n${member.name}\n`;
    const body = lines.map((l) => `${dayLabel(l.date, locale, true)}  ${l.title}  ${formatSignedCurrency(l.amount, currency)}`).join("\n");
    const foot = `\n${t("Balance")}: ${formatSignedCurrency(balance, currency)} (${even ? t("Settled") : owes ? t("Has to pay") : t("Gets back")})`;
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
          {member && <PersonAvatar name={member.name} src={member.photoUrl} size={40} coloured />}
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <SheetTitle className="truncate text-h3 text-ink">{member?.name}</SheetTitle>
            <span className="text-small leading-normal text-ink-muted">{t("{group} · {month} statement", { group: data.name, month: monthLabel })}</span>
          </div>
          <CloseX onClick={onClose} />
        </SheetHeader>

        <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-4" : "px-4 py-3")}>
          <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-lg border border-line md:grid-cols-4">
            {summary.map((cell, i) => (
              <div key={cell.label} className={cn("flex min-w-0 flex-col gap-0.5 px-3 py-3", i < summary.length - 1 && "md:border-r md:border-line", i % 2 === 0 && "border-r border-line md:border-r-0", i < 2 && "border-b border-line md:border-b-0")}>
                <span className="text-caption font-normal text-ink-muted">{cell.label}</span>
                <span className={cn("text-title font-bold tabular-nums", cell.tone)}>{cell.value}</span>
                <span className="truncate text-caption font-normal text-ink-muted" title={cell.sub}>
                  {cell.sub}
                </span>
              </div>
            ))}
          </div>

          <div className={cn("flex shrink-0 items-center justify-between gap-3 rounded-lg border px-4 py-3", even ? "border-line bg-strip" : owes ? "border-expense/25 bg-expense-soft" : "border-mint-200 bg-mint-50")}>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className={cn("text-small font-semibold", even ? "text-ink" : owes ? "text-expense" : "text-income")}>{even ? t("Settled") : owes ? t("Has to pay") : t("Gets back")}</span>
              {/* What they put in counts their own-pocket payments too, as their balance does. */}
              <span className={cn("text-caption font-normal tabular-nums", even ? "text-ink-muted" : owes ? "text-expense" : "text-income")}>{t("{paid} paid in − {cost} cost", { paid: money(row ? paidIn(row) : 0), cost: money(share) })}</span>
            </div>
            <span className={cn("text-h1 tabular-nums", even ? "text-ink" : owes ? "text-expense" : "text-income")}>{formatSignedCurrency(balance, currency)}</span>
          </div>

          <ListCard label={t("{name}'s statement", { name: member?.name ?? "" })} elevated={false} className="shrink-0">
            <ListHead columns={COLUMNS}>
              <ListHeadCell>{t("Date")}</ListHeadCell>
              <ListHeadCell>{t("Entry")}</ListHeadCell>
              <ListHeadCell align="end">{t("Amount")}</ListHeadCell>
              <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
            </ListHead>
            {lines.length === 0 && <ListEmpty title={t("Nothing recorded for this member yet.")} className="py-6 text-small" />}
            {lines.map((line, i) => (
              <ListRow key={i} columns={COLUMNS} density="dense" className="text-small tabular-nums">
                <ListCell className="hidden text-ink-muted md:block">{dayLabel(line.date, locale)}</ListCell>
                <ListCell className="flex flex-col">
                  <span className="truncate font-medium text-ink">{line.title}</span>
                  <span className="truncate text-caption font-normal text-ink-muted">
                    <span className="md:hidden">{dayLabel(line.date, locale)} · </span>
                    {line.sub}
                  </span>
                </ListCell>
                <ListCell align="end" className="flex flex-col items-end">
                  <span className={cn("font-semibold", line.amount > 0 ? "text-income" : "text-ink")}>{formatSignedCurrency(line.amount, currency)}</span>
                  <span className={cn("text-caption md:hidden", line.balance < -0.004 ? "text-expense" : "text-ink-muted")}>{formatSignedCurrency(line.balance, currency)}</span>
                </ListCell>
                <ListCell align="end" className={cn("hidden md:block", line.balance < -0.004 ? "text-expense" : "text-ink-2")}>
                  {formatSignedCurrency(line.balance, currency)}
                </ListCell>
              </ListRow>
            ))}
          </ListCard>
          <span className="text-caption font-normal leading-relaxed text-ink-muted">{t("Each cost is shared the way its expense says, among the members there that day. The shares change if more is recorded before the month is closed.")}</span>
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
            <Button type="button" variant="action" onClick={onRecordPayment} className="px-5">
              {t("Record payment")}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
