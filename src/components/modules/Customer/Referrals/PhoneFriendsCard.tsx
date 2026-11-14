"use client";

import Link from "next/link";
import Avatar from "@/components/smartly/Avatar";
import { formatCurrency } from "@/lib/customer/currency";
import { dayOf, friendDay } from "@/lib/customer/referralDisplay";
import type { FriendList, FriendRow } from "@/lib/customer/referralTypes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { USERS_ROUTE } from "./DashboardCards";

const SHOWN = 5;

// How a friend stands, as the phone board's small chip.
const CHIP: Record<FriendRow["standing"], { label: string; className: string }> = {
  PAYING: { label: "Bought", className: "bg-mint-50 text-brand-ink" },
  FREE: { label: "Not bought", className: "bg-surface-sunken text-ink-soft" },
  STOPPED: { label: "Stopped", className: "bg-warning-soft text-due-ink" },
  REFUNDED: { label: "Refunded", className: "bg-expense-soft text-expense" },
  BLOCKED: { label: "Not counted", className: "bg-surface-sunken text-ink-soft" },
};

// Phones (ReferralMobile): "Friends · 9 joined, 6 bought", the newest five
// with what each earned, and See all.
export function PhoneFriendsCard({ friends, currency, today }: { friends: FriendList | null; currency: string; today: string }) {
  const { t, fmt } = useLocale();
  if (!friends || friends.counts.ALL === 0) return null;
  const bought = friends.counts.PAYING + friends.counts.STOPPED + friends.counts.REFUNDED;
  const rows = friends.data.slice(0, SHOWN);
  return (
    <section aria-labelledby="rm-friends" className="overflow-clip rounded-card border border-line-card bg-surface shadow-card md:hidden">
      <h2 id="rm-friends" className="px-4 pt-3.5 pb-2.5 text-[15px] font-semibold text-ink">
        {t("Friends · {joined} joined, {bought} bought", { joined: formatCount(friends.counts.ALL, fmt), bought: formatCount(bought, fmt) })}
      </h2>
      <ul>
        {rows.map((row) => {
          const chip = CHIP[row.standing];
          const earned = Number(row.earned) > 0;
          const day = friendDay(dayOf(row.joinedAt), today, fmt);
          return (
            <li key={row.id} className="flex min-h-14.5 items-center gap-2.5 border-t border-divider px-4">
              <Avatar name={row.name} size={36} tone="soft" alt="" className="size-8.5" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-body font-semibold text-ink">{row.name}</span>
                <span className="truncate text-caption text-ink-muted">{row.planName ? t("{plan} · joined {date}", { plan: row.planName, date: day }) : t("Joined {date} · Free plan", { date: day })}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.75">
                <span className={cn("text-body font-bold tabular-nums", earned ? "text-ink" : "text-ink-faint")}>{earned ? formatCurrency(row.earned, currency, fmt) : "—"}</span>
                <span className={cn("rounded-full px-1.75 py-px text-[11px] font-semibold", chip.className)}>{t(chip.label)}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <Link href={USERS_ROUTE} className="flex h-11.5 items-center justify-center border-t border-divider text-body font-semibold text-emerald">
        {t(friends.counts.ALL === 1 ? "See all {count} friend" : "See all {count} friends", { count: formatCount(friends.counts.ALL, fmt) })}
      </Link>
    </section>
  );
}
