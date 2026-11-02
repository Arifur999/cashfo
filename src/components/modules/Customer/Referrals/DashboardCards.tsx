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
const TITLE = "text-[15px] leading-normal font-semibold text-ink md:text-title";
const MORE = "rounded-sm text-[13px] font-semibold whitespace-nowrap text-emerald hover:underline";

// "Earnings by month": a bar for each month from the first earnings (the
// last six), this month in full colour, and next month's expected renewals
// as a dashed bar (ReferralDashboard).
export function EarningsByMonthCard({ info, currency, today }: { info: ReferralProgramInfo; currency: string; today: string }) {
  const { t, fmt } = useLocale();
  const money = (value: number | string) => formatCurrency(value, currency, fmt);
  const months = chartMonths(info.months);
  const expected = Number(info.expectedNext30Days);
  const bars = [...months.map((m) => ({ ...m, expected: false })), ...(expected > 0 ? [{ month: "", amount: expected, expected: true }] : [])];
  const top = Math.max(1, ...bars.map((bar) => bar.amount));
  const thisMonth = today.slice(0, 7);
  const label = (month: string) => formatDate(`${month}-15T06:00:00Z`, month.slice(0, 4) === today.slice(0, 4) ? "MMM" : "MMM yy", "", fmt);

  return (
    <Card padding="none" className="flex flex-col gap-4 p-4 md:p-5">
      <div className={HEAD}>
        <h2 className={TITLE}>{t("Earnings by month")}</h2>
        <span className="text-caption text-ink-muted md:text-[13px]">{t("By the month your friends paid")}</span>
      </div>
      <div role="list" aria-label={t("Earnings by month")} className="flex h-50 items-end gap-3 border-b border-line md:gap-6">
        {bars.map((bar) => {
          const current = bar.month === thisMonth;
          const height = Math.max(4, Math.round((bar.amount / top) * 150));
          return (
            <div key={bar.month || "expected"} role="listitem" className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-caption font-semibold whitespace-nowrap text-ink tabular-nums">{money(bar.amount)}</span>
              <span
                aria-hidden="true"
                style={{ height }}
                className={cn("w-full max-w-20 rounded-t-md", bar.expected ? "border-[1.5px] border-dashed border-emerald/60 bg-transparent" : current ? "bg-emerald" : "bg-emerald/35")}
              />
              <span className="sr-only">{bar.expected ? t("Expected next month") : label(bar.month)}</span>
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="-mt-2 flex gap-3 md:gap-6">
        {bars.map((bar) => (
          <span key={bar.month || "expected"} className="flex min-w-0 flex-1 flex-col items-center text-center leading-tight">
            <span className="text-[13px] font-semibold text-ink-2">{bar.expected ? t("Next") : label(bar.month)}</span>
            <span className="text-caption text-ink-muted">{bar.expected ? t("Expected") : bar.month === thisMonth ? t("This month") : " "}</span>
          </span>
        ))}
      </div>
    </Card>
  );
}

const MIX: Record<"PAYING" | "FREE" | "STOPPED" | "REFUNDED", { label: string; dot: string }> = {
  PAYING: { label: "Paying", dot: "bg-emerald" },
  FREE: { label: "Not paying yet", dot: "bg-ink-faint/50" },
  STOPPED: { label: "Stopped", dot: "bg-warning-fill" },
  REFUNDED: { label: "Refunded", dot: "bg-expense-fill" },
};

// "People you brought": the mix as one bar, a tile for each standing, and
// what paying friends' renewals should earn next.
export function PeopleCard({ info, currency }: { info: ReferralProgramInfo; currency: string }) {
  const { t, fmt } = useLocale();
  const mix = peopleMix(info.people);
  const expected = Number(info.expectedNext30Days);

  return (
    <Card padding="none" className="flex flex-col gap-3.5 p-4 md:p-5">
      <div className={HEAD}>
        <h2 className={TITLE}>{t("People you brought")}</h2>
        <Link href={USERS_ROUTE} className={MORE}>
          {t("See all {count}", { count: formatCount(info.people.total, fmt) })}
        </Link>
      </div>
      <div aria-hidden="true" className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-sunken">
        {mix.map((part) => part.pct > 0 && <span key={part.key} style={{ width: `${part.pct}%` }} className={MIX[part.key].dot} />)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {mix.map((part) => (
          <Link key={part.key} href={`${USERS_ROUTE}?tab=${part.key === "STOPPED" || part.key === "REFUNDED" ? "ENDED" : part.key}`} className="flex flex-col gap-0.5 rounded-field border border-line px-3 py-2.5 hover:border-line-strong">
            <span className="flex items-center gap-2 text-[18px] leading-normal font-bold text-ink tabular-nums">
              <span aria-hidden="true" className={cn("size-2 rounded-full", MIX[part.key].dot)} />
              {formatCount(part.count, fmt)}
            </span>
            <span className="text-caption text-ink-muted">{t(MIX[part.key].label)}</span>
          </Link>
        ))}
      </div>
      {expected > 0 && (
        <p className="flex items-start gap-2 rounded-field bg-strip px-3 py-2.5 text-[13px] leading-[1.45] text-ink-soft">
          <CircleDollarSign className="mt-0.5 size-3.75 shrink-0 text-emerald" aria-hidden="true" />
          {t(info.expectedRenewals === 1 ? "In the next 30 days you should earn about {amount} from {count} renewal, if your friends keep paying." : "In the next 30 days you should earn about {amount} from {count} renewals, if your friends keep paying.", {
            amount: formatCurrency(expected, currency, fmt),
            count: formatCount(info.expectedRenewals, fmt),
          })}
        </p>
      )}
    </Card>
  );
}

// "Who earns you the most": the friends with the biggest total, with a bar
// against the first.
export function TopFriendsCard({ info, currency }: { info: ReferralProgramInfo; currency: string }) {
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
          {info.topFriends.map((friend) => (
            <li key={friend.referralId} className="flex items-center gap-3 border-t border-divider px-4 py-2.5 md:px-5">
              <Avatar name={friend.name} size={32} tone="soft" alt="" />
              <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{friend.name}</span>
              <span aria-hidden="true" className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-surface-sunken sm:block">
                <span style={{ width: `${(Number(friend.earned) / top) * 100}%` }} className="block h-full rounded-full bg-emerald" />
              </span>
              <span className="w-24 text-right text-body font-bold text-ink tabular-nums">{formatCurrency(friend.earned, currency, fmt)}</span>
            </li>
          ))}
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
              <span className={cn("text-body font-bold tabular-nums", line.status === "REVERSED" || line.status === "CANCELLED" ? "text-ink-muted line-through" : "text-ink")}>{formatCurrency(line.amount, currency, fmt)}</span>
              <CommissionStatusCell line={line} today={today} align="end" className="w-30 shrink-0" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
