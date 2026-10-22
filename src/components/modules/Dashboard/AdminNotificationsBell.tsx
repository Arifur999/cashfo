"use client";

import { Bell, Bug, CreditCard, MessageSquare, ShieldAlert, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { getAdminFeedAction, markAdminFeedSeenAction } from "@/app/-actions/adminFeedActions";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { adminFeedRow, type AdminFeedTone } from "@/lib/adminFeedDisplay";
import { formatRecentDateTime } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { AdminFeedGroup, AdminFeedKind, IAdminFeed } from "@/types/adminFeed.types";

const KIND_ICON: Record<AdminFeedKind, LucideIcon> = {
  PAYMENT_FAILED: CreditCard,
  TICKET_WAITING: MessageSquare,
  SECURITY_FLAG: ShieldAlert,
  SIGN_INS_PAUSED: ShieldAlert,
  ERRORS: Bug,
};

const TONE_TILE: Record<AdminFeedTone, string> = {
  expense: "bg-expense-soft text-expense",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-surface-sunken text-ink-2",
};

const GROUP_LABEL: Record<AdminFeedGroup, string> = { MONEY: "Money", SUPPORT: "Support", SYSTEM: "System" };

type Filter = "ALL" | AdminFeedGroup;

// The admin bell: failed payments, customers waiting on support, security
// flags and errors -- only what this admin's role can act on, newest first.
// The rows newer than the last "Mark all as read" are the unread ones.
const AdminNotificationsBell = () => {
  const { t, locale } = useLocale();
  const [feed, setFeed] = useState<IAdminFeed | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("ALL");

  const load = () =>
    getAdminFeedAction().then((result) => {
      if (result.success) setFeed(result.data);
    });
  const loadOnMount = useEffectEvent(load);
  useEffect(() => {
    void loadOnMount();
  }, []);

  // A content admin has nothing to act on here.
  if (!feed || feed.groups.length === 0) return null;

  const unread = feed.unreadCount;
  const rows = feed.data.map((item, index) => ({ item, unread: index < unread }));
  const shown = filter === "ALL" ? rows : rows.filter((row) => row.item.group === filter);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) void load();
  }

  function markAll() {
    setFeed((current) => (current ? { ...current, unreadCount: 0 } : current));
    markAdminFeedSeenAction().then((result) => {
      if (!result.success) toast.error(result.message);
    });
  }

  const label = unread > 0 ? `${t("Notifications")}, ${t("{count} new", { count: unread })}` : t("Notifications");

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger
        aria-label={label}
        title={t("Notifications")}
        className="relative flex size-11 shrink-0 items-center justify-center rounded-md text-ink-2 md:size-10 md:border md:border-line md:bg-surface md:hover:bg-surface-sunken data-open:bg-surface-sunken"
      >
        <Bell className="size-5 md:size-4.5" aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-expense-fill px-1 text-caption leading-4 font-bold text-white tabular-nums shadow-[0_0_0_2px_var(--surface)] md:-top-1.5 md:-right-1.5"
          >
            {unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(26.25rem,calc(100vw-1rem))] gap-0 overflow-hidden rounded-lg border border-line bg-surface p-0 text-ink shadow-overlay ring-0">
        <div className="flex items-center justify-between gap-3 p-4">
          <h2 className="text-title font-bold text-ink">{t("Notifications")}</h2>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="text-small font-semibold text-emerald hover:underline">
              {t("Mark all as read")}
            </button>
          )}
        </div>
        {feed.groups.length > 1 && (
          <div className="px-4 pb-3">
            <SegmentedControl
              label="Show"
              value={filter}
              onChange={setFilter}
              className="[&>button]:h-7.5"
              options={[{ value: "ALL" as Filter, label: t("All") }, ...feed.groups.map((group) => ({ value: group as Filter, label: t(GROUP_LABEL[group]) }))]}
            />
          </div>
        )}
        <ul className="max-h-[min(30rem,calc(100vh-14rem))] overflow-y-auto">
          {shown.length === 0 && <li className="border-t border-divider px-4 py-8 text-center text-small text-ink-muted">{t("Nothing needs you right now.")}</li>}
          {shown.map(({ item, unread: isNew }) => {
            const row = adminFeedRow(item, t, undefined, locale);
            const Icon = KIND_ICON[item.kind];
            return (
              <li key={item.id}>
                <Link href={item.href} onClick={() => setOpen(false)} className="flex gap-3 border-t border-divider p-4 hover:bg-hover">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", TONE_TILE[row.tone])}>
                    <Icon className="size-4.25" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <b className="text-body font-semibold text-ink">{row.title}</b>
                    {row.body && <span className="text-small text-ink-2">{row.body}</span>}
                    <span className="text-caption text-ink-muted">{formatRecentDateTime(item.at, { t, locale })}</span>
                  </span>
                  {isNew && <span aria-label={t("Unread")} className="mt-2 size-2 shrink-0 rounded-full bg-emerald" />}
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-line bg-strip px-4 py-3 text-caption text-ink-muted">{t("Only what your role can act on is shown here.")}</p>
      </PopoverContent>
    </Popover>
  );
};

export default AdminNotificationsBell;
