"use client";

import { CircleDollarSign } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/smartly/Avatar";
import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/customer/currency";
import { chartMonths, KIND_LABEL, peopleMix } from "@/lib/customer/referralDisplay";
import type { Earning, ReferralProgramInfo } from "@/lib/customer/referralTypes";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CommissionStatusCell } from "./CommissionStatusCell";

export const USERS_ROUTE = "/referrals/users";
export const EARNINGS_ROUTE = "/referrals/earnings";

const HEAD = "flex items-center justify-between gap-3";
const TITLE = "text-[15px] leading-[normal] font-semibold text-ink md:text-title";
const MORE = "rounded-sm text-[13px] font-semibold whitespace-nowrap text-emerald hover:underline";

// "Earnings by month": the last three months, this one in full colour, and
// what renewals due next month should earn as a dashed bar
// (ReferralDashboard). A bar opens that month's lines.
export function EarningsByMonthCard({ info, currency, today }: { info: ReferralProgramInfo; currency: string; today: string }) {
  const { t, fmt } = useLocale();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const thisMonth = today.slice(0, 7);
  const next = info.expectedNextMonth ?? { month: nextMonthOf(thisMonth), amount: info.expectedNext30Days, renewals: info.expectedRenewals };
  const bars = [...chartMonths(info.months).map((m) => ({ ...m, expected: false })), { month: next.month, amount: Number(next.amount), expected: true }];
  const top = Math.max(1, ...bars.map((bar) => bar.amount));
  const label = (month: string) => formatDate(`${month}-15T06:00:00Z`, month.slice(0, 4) === today.slice(0, 4) ? "MMM" : "MMM yy", "", fmt);
  const cols = { gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` };

  return (
    <Card padding="none" className="flex flex-col gap-3.5 p-4 md:px-5 md:py-4.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={TITLE}>{t("Earnings by month")}</h2>
        <span className="text-caption text-ink-muted md:text-[12.5px]">{t("By the month your friends paid")}</span>
      </div>
      <div role="list" aria-label={t("Earnings by month")} style={cols} className="grid h-42.5 items-end gap-3 border-b border-line px-1.5 md:gap-4.5">
        {bars.map((bar) => {
          const current = bar.month === thisMonth;
          const href = bar.expected ? `${USERS_ROUTE}?tab=PAYING` : `${EARNINGS_ROUTE}?month=${Number(bar.month.slice(5, 7))}&year=${bar.month.slice(0, 4)}`;
          return (
            <Link key={bar.month + String(bar.expected)} role="listitem" href={href} className="flex h-full min-w-0 flex-col items-center justify-end gap-1.5 rounded-t-sm">
              <span className={cn("text-[12.5px] font-bold whitespace-nowrap tabular-nums", bar.expected ? "text-ink-muted" : "text-ink")}>{money(bar.amount)}</span>
              <span
                aria-hidden="true"
                style={{ height: Math.max(4, Math.round((bar.amount / top) * 130)) }}
                className={cn("w-[56%] rounded-t-sm", bar.expected ? "border-2 border-dashed border-emerald/55 bg-transparent" : current ? "bg-emerald" : "bg-emerald/45")}
              />
              <span className="sr-only">{bar.expected ? t("Expected") : label(bar.month)}</span>
            </Link>
          );
        })}
      </div>
      <div aria-hidden="true" style={cols} className="-mt-1.5 grid gap-3 px-1.5 md:gap-4.5">
        {bars.map((bar) => (
          <span key={bar.month + String(bar.expected)} className="flex min-w-0 flex-col items-center gap-px text-center">
            <span className="text-[13px] font-semibold text-ink-2">{label(bar.month)}</span>
            <span className="text-[11.5px] text-ink-faint">{bar.expected ? t("Expected") : bar.month === thisMonth ? t("This month") : " "}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}

// "YYYY-MM" of the month after.
function nextMonthOf(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

const MIX: Record<"PAYING" | "FREE" | "STOPPED" | "REFUNDED", { label: string; dot: string }> = {
  PAYING: { label: "Paying", dot: "bg-emerald" },
  FREE: { label: "Not paying yet", dot: "bg-input" },
  STOPPED: { label: "Stopped", dot: "bg-warning-fill" },
  REFUNDED: { label: "Refunded", dot: "bg-expense-fill" },
};

// "People you brought": the mix as one bar, a tile for each standing, and
// what paying friends' renewals should earn next month.
export function PeopleCard({ info, currency, today }: { info: ReferralProgramInfo; currency: string; today: string }) {
  const { t, fmt } = useLocale();
  const mix = peopleMix(info.people);
  const next = info.expectedNextMonth ?? null;
  const expected = Number(next ? next.amount : info.expectedNext30Days);
  const renewals = next ? next.renewals : info.expectedRenewals;
  const monthName = formatDate(`${next?.month ?? nextMonthOf(today.slice(0, 7))}-15T06:00:00Z`, "MMMM", "", fmt);

  return (
    <Card padding="none" className="flex flex-col gap-3 p-4 md:px-5 md:py-4.5">
      <div className={HEAD}>
        <h2 className={TITLE}>{t("People you brought")}</h2>
        <Link href={USERS_ROUTE} className={MORE}>
          {t("See all {count}", { count: formatCount(info.people.total, fmt) })}
        </Link>
      </div>
      <div aria-hidden="true" className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-sunken">
        {mix.map((part) => part.pct > 0 && <span key={part.key} style={{ width: `${part.pct}%` }} className={MIX[part.key].dot} />)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {mix.map((part) => (
          <Link key={part.key} href={`${USERS_ROUTE}?tab=${part.key === "STOPPED" || part.key === "REFUNDED" ? "ENDED" : part.key}`} className="flex items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2.5 hover:border-line-strong">
            <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-[3px]", MIX[part.key].dot)} />
            <span className="flex min-w-0 flex-col gap-px">
              <span className="text-[18px] font-bold text-ink tabular-nums">{formatCount(part.count, fmt)}</span>
              <span className="text-caption text-ink-muted">{t(MIX[part.key].label)}</span>
            </span>
          </Link>
        ))}
      </div>
      {expected > 0 && (
        <p className="flex items-start gap-2 rounded-field bg-strip px-3 py-2.5 text-[12.5px] leading-[1.45] text-ink-soft">
          <CircleDollarSign className="mt-px size-3.5 shrink-0 text-emerald" aria-hidden="true" />
          {next
            ? t(renewals === 1 ? "In {month} you should earn about {amount} from {count} renewal, if your friends keep paying." : "In {month} you should earn about {amount} from {count} renewals, if your friends keep paying.", {
                month: monthName,
                amount: formatCurrency(expected, currency, fmt),
                count: formatCount(renewals, fmt),
              })
            : t(renewals === 1 ? "In the next 30 days you should earn about {amount} from {count} renewal, if your friends keep paying." : "In the next 30 days you should earn about {amount} from {count} renewals, if your friends keep paying.", {
                amount: formatCurrency(expected, currency, fmt),
                count: formatCount(renewals, fmt),
              })}
        </p>
      )}
    </Card>
  );
}

// "Who earns you the most": the friends with the biggest total, their plan
// and payments, with a bar against the first; a row opens the friend.
export function TopFriendsCard({ info, currency, onOpen }: { info: ReferralProgramInfo; currency: string; onOpen: (friend: { id: string; name: string }) => void }) {
  const { t, fmt } = useLocale();
  const top = Math.max(1, ...info.topFriends.map((f) => Number(f.earned)));
  return (
    <Card padding="none" className="flex flex-col overflow-clip">
      <div className={cn(HEAD, "px-4 pt-4 pb-3 md:px-5")}>
        <h2 className={TITLE}>{t("Who earns you the most")}</h2>
        <span className="text-caption text-ink-muted md:text-[13px]">{t("All time")}</span>
      </div>
      {info.topFriends.length === 0 ? (
        <p className="border-t border-divider px-4 py-4 text-small text-ink-muted md:px-5">{t("When friends pay, the ones who earn you the most show here.")}</p>
      ) : (
        <ul>
          {info.topFriends.map((friend) => {
            const planLine = [friend.planName ?? (friend.payments === undefined ? null : t("Free")), friend.payments === undefined ? null : t(friend.payments === 1 ? "{count} payment" : "{count} payments", { count: formatCount(friend.payments, fmt) })].filter(Boolean).join(" · ");
            return (
              <li key={friend.referralId} className="border-t border-divider">
                <button
                  type="button"
                  onClick={() => onOpen({ id: friend.referralId, name: friend.name })}
                  className="grid w-full grid-cols-[32px_minmax(0,1fr)_86px] items-center gap-x-3 px-4 py-2.5 text-left tabular-nums hover:bg-surface-sunken/60 sm:grid-cols-[32px_minmax(0,1fr)_110px_86px] md:px-5"
                >
                  <Avatar name={friend.name} size={32} tone="soft" alt="" />
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="truncate text-body font-semibold text-ink">{friend.name}</span>
                    {planLine && <span className="truncate text-caption text-ink-muted">{planLine}</span>}
                  </span>
                  <span aria-hidden="true" className="hidden h-2 overflow-hidden rounded-full bg-surface-sunken sm:block">
                    <span style={{ width: `${(Number(friend.earned) / top) * 100}%` }} className="block h-full rounded-full bg-emerald" />
                  </span>
                  <span className="text-right text-body font-bold text-ink">{formatCurrency(friend.earned, currency, fmt)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// The plan and what the payment was ("Monthly Pro · Renewal · 19 Oct").
export function useEarningLine() {
  const { t, fmt } = useLocale();
  return (line: Pick<Earning, "planName" | "kind" | "paidAt">, today: string, discountPct?: number) =>
    [
      line.planName,
      line.kind === "FIRST" && discountPct ? t("First payment · {pct}% off", { pct: formatCount(discountPct, fmt) }) : t(KIND_LABEL[line.kind]),
      formatDate(line.paidAt, line.paidAt.slice(0, 4) === today.slice(0, 4) ? "d MMM" : "d MMM yyyy", "", fmt),
    ]
      .filter(Boolean)
      .join(" · ");
}

// "Latest commissions": the newest lines with their status.
export function LatestCommissionsCard({ info, currency, today }: { info: ReferralProgramInfo; currency: string; today: string }) {
  const { t, fmt } = useLocale();
  const describe = useEarningLine();
  return (
    <Card padding="none" className="flex flex-col overflow-clip">
      <div className={cn(HEAD, "px-4 pt-4 pb-3 md:px-5")}>
        <h2 className={TITLE}>{t("Latest commissions")}</h2>
        <Link href={EARNINGS_ROUTE} className={MORE}>
          {t("All earnings")}
        </Link>
      </div>
      {info.latest.length === 0 ? (
        <p className="border-t border-divider px-4 py-4 text-small text-ink-muted md:px-5">{t("Each payment your friends make shows here with your share.")}</p>
      ) : (
        <ul>
          {info.latest.map((line) => (
            <li key={line.id} className="flex items-center gap-3 border-t border-divider px-4 py-2.5 md:px-5">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-semibold text-ink">{line.friendName}</span>
                <span className="truncate text-caption text-ink-muted">{describe(line, today)}</span>
              </span>
              <span className={cn("w-22.5 shrink-0 text-right text-body font-bold tabular-nums", line.status === "REVERSED" || line.status === "CANCELLED" ? "text-ink-muted line-through" : "text-ink")}>{formatCurrency(line.amount, currency, fmt)}</span>
              <CommissionStatusCell line={line} today={today} align="end" className="w-32 shrink-0" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
