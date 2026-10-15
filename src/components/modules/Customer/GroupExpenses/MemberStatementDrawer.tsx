"use client";

import { MessageCircle, Printer, X } from "lucide-react";
import { PersonAvatar } from "@/components/modules/Customer/Shared/PersonAvatar";
import Button from "@/components/smartly/Button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { GroupMember } from "@/lib/customer/api";
import { formatCurrency, formatSignedCurrency } from "@/lib/customer/currency";
import { formatDate } from "@/lib/customer/date";
import { monthName } from "@/lib/customer/insights";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
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

// One member's month: what they paid in, their share of each cost, and
// where that leaves them. Sent on WhatsApp as text, or printed.
export function MemberStatementDrawer({ open, onClose, data, view, member, onRecordPayment }: MemberStatementDrawerProps) {
  const { t, locale } = useLocale();
  const wide = useMediaQuery("(min-width: 768px)");
  const { currency, range } = data;
  const monthLabel = monthName(range.key, locale, "long", true);
  const row = member ? data.settlement.members.find((r) => r.groupMemberId === member.id) : undefined;
  const memberCount = data.settlement.memberCount || view.activeMembers.length || 1;

  const entries: Entry[] = member
    ? [
        ...data.contributions.filter((c) => c.groupMemberId === member.id).map((c) => ({ date: c.date.slice(0, 10), title: t(Number(c.amount) < 0 ? "Return" : "Contribution"), sub: c.note ?? t("Cash to the fund"), amount: Number(c.amount) })),
        ...data.expenses.map((e) => ({ date: e.date.slice(0, 10), title: `${e.category} ${t("share")}`, sub: `${formatCurrency(e.amount, currency)} ÷ ${memberCount}${e.description ? ` · ${e.description}` : ""}`, amount: -Number(e.amount) / memberCount })),
      ].sort((a, b) => a.date.localeCompare(b.date))
    : [];
  const lines = entries.reduce<(Entry & { balance: number })[]>((acc, entry) => {
    const balance = (acc[acc.length - 1]?.balance ?? 0) + entry.amount;
    return [...acc, { ...entry, balance }];
  }, []);

  const contributed = row ? Number(row.contributed) : 0;
  const deposits = member ? data.contributions.filter((c) => c.groupMemberId === member.id && Number(c.amount) > 0).length : 0;
  const returned = row ? Number(row.returned) : 0;
  const share = row ? Number(row.share) : 0;
  const balance = row ? Number(row.balance) : 0;
  const owes = balance < -0.004;
  const even = Math.abs(balance) < 0.005;

  const summary = [
    { label: t("Contributed"), value: formatCurrency(contributed + returned, currency), sub: `${deposits} ${t(deposits === 1 ? "deposit" : "deposits")}`, tone: "text-income" },
    { label: t("Returned"), value: formatCurrency(returned, currency), sub: returned > 0 ? t("paid back") : "—", tone: "text-ink" },
    { label: t("Share of costs"), value: formatCurrency(share, currency), sub: `${formatCurrency(data.settlement.totalExpense, currency)} ÷ ${memberCount}`, tone: "text-ink" },
    { label: t("Balance"), value: formatSignedCurrency(balance, currency), sub: even ? t("Settled") : owes ? t("Has to pay") : t("Gets back"), tone: even ? "text-ink" : owes ? "text-expense" : "text-income" },
  ];

  function statementText(): string {
    if (!member) return "";
    const head = `${data.name} · ${monthLabel}\n${member.name}\n`;
    const body = lines.map((l) => `${formatDate(l.date)}  ${l.title}  ${formatSignedCurrency(l.amount, currency)}`).join("\n");
    const foot = `\n${t("Balance")}: ${formatSignedCurrency(balance, currency)} (${even ? t("Settled") : owes ? t("Has to pay") : t("Gets back")})`;
    return `${head}\n${body}\n${foot}`;
  }

  function sendWhatsApp() {
    const digits = (member?.phone ?? "").replace(/\D/g, "");
    const to = digits ? (digits.startsWith("880") ? digits : `880${digits.replace(/^0/, "")}`) : "";
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(statementText())}`, "_blank", "noopener");
  }

  function print() {
    const w = window.open("", "_blank", "noopener,width=720,height=900");
    if (!w) return;
    const escape = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);
    w.document.write(`<!doctype html><title>${escape(member?.name ?? "")} · ${escape(monthLabel)}</title><pre style="font: 14px/1.5 system-ui, sans-serif; padding: 24px; white-space: pre-wrap">${escape(statementText())}</pre>`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 border-0 bg-surface p-0 text-ink", wide ? "w-135 shadow-[-28px_0_60px_-16px_rgba(11,61,46,0.3)] data-[side=right]:sm:max-w-135" : "h-[92vh] rounded-t-xl")}>
        <SheetHeader className={cn("flex-row items-center gap-3 space-y-0", wide ? "border-b border-line px-6 py-4" : "px-4 pt-4 pb-2")}>
          {member && <PersonAvatar name={member.name} src={member.photoUrl} size={40} coloured />}
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <SheetTitle className="truncate text-h3 text-ink">{member?.name}</SheetTitle>
            <span className="text-small text-ink-muted">
              {data.name} · {monthLabel} {t("statement")}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </SheetHeader>

        <div className={cn("flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto", wide ? "px-6 py-4" : "px-4 py-3")}>
          <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-lg border border-line md:grid-cols-4">
            {summary.map((cell, i) => (
              <div key={cell.label} className={cn("flex flex-col gap-0.5 px-3 py-3", i < summary.length - 1 && "md:border-r md:border-line", i % 2 === 0 && "border-r border-line md:border-r-0", i < 2 && "border-b border-line md:border-b-0")}>
                <span className="text-caption font-normal text-ink-muted">{cell.label}</span>
                <span className={cn("text-title font-bold tabular-nums", cell.tone)}>{cell.value}</span>
                <span className="truncate text-caption font-normal text-ink-muted">{cell.sub}</span>
              </div>
            ))}
          </div>

          <div className={cn("flex shrink-0 items-center justify-between rounded-lg border px-4 py-3", even ? "border-line bg-cream" : owes ? "border-expense/25 bg-expense-soft" : "border-mint-200 bg-mint-50")}>
            <div className="flex flex-col gap-0.5">
              <span className={cn("text-small font-semibold", even ? "text-ink" : owes ? "text-expense" : "text-income")}>{even ? t("Settled") : owes ? t("Has to pay") : t("Gets back")}</span>
              <span className={cn("text-caption font-normal tabular-nums", even ? "text-ink-muted" : owes ? "text-expense" : "text-income")}>
                {formatCurrency(contributed, currency)} {t("paid in")} − {formatCurrency(share, currency)} {t("cost")}
              </span>
            </div>
            <span className={cn("text-h1 tabular-nums", even ? "text-ink" : owes ? "text-expense" : "text-income")}>{formatSignedCurrency(balance, currency)}</span>
          </div>

          <div className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-line">
            <div className="grid grid-cols-[56px_minmax(0,1fr)_86px_86px] gap-3 border-b border-line bg-cream px-4 py-2 text-caption font-medium text-ink-muted">
              <span>{t("Date")}</span>
              <span>{t("Entry")}</span>
              <span className="text-right">{t("Amount")}</span>
              <span className="text-right">{t("Balance")}</span>
            </div>
            {lines.length === 0 && <p className="px-4 py-6 text-center text-small text-ink-muted">{t("Nothing recorded for this member yet.")}</p>}
            {lines.map((line, i) => (
              <div key={i} className="grid min-h-9 grid-cols-[56px_minmax(0,1fr)_86px_86px] items-center gap-3 border-b border-surface-sunken px-4 py-1 text-small tabular-nums last:border-b-0">
                <span className="text-ink-muted">{formatDate(line.date, "dd MMM")}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-ink">{line.title}</span>
                  <span className="truncate text-caption font-normal text-ink-muted">{line.sub}</span>
                </span>
                <span className={cn("text-right font-semibold", line.amount > 0 ? "text-income" : "text-ink")}>{formatSignedCurrency(line.amount, currency)}</span>
                <span className={cn("text-right", line.balance < -0.004 ? "text-expense" : "text-ink-2")}>{formatSignedCurrency(line.balance, currency)}</span>
              </div>
            ))}
          </div>
          <span className="text-caption font-normal leading-relaxed text-ink-muted">{t("Each cost is shared equally among the members. The shares change if more is recorded before the month is closed.")}</span>
        </div>

        <div className={cn("flex items-center gap-3 border-t border-line bg-surface", wide ? "px-6 py-4" : "px-4 py-3")}>
          <Button type="button" variant="secondary" onClick={sendWhatsApp} disabled={!member}>
            <MessageCircle />
            {t("Send on WhatsApp")}
          </Button>
          <Button type="button" variant="secondary" onClick={print} disabled={!member}>
            <Printer />
            {t("Print")}
          </Button>
          <span className="flex-1" />
          {!even && (
            <Button type="button" onClick={onRecordPayment} className="px-5">
              {t("Record a payment")}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
