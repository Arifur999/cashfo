"use client";

import {
  CalendarDays,
  Sparkles,
  AlarmClock,
  Banknote,
  Bell,
  CalendarClock,
  ChartPie,
  CreditCard,
  Gift,
  HandCoins,
  Lightbulb,
  Megaphone,
  MessageCircle,
  PiggyBank,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import { SOFT_TONE, type Tone } from "@/components/smartly/tones";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { UserNotification } from "@/lib/customer/api";
import { switchWorkspaceAction } from "@/lib/customer/businessActions";
import { notificationTime, notificationView, type NotificationKind } from "@/lib/customer/notificationDisplay";
import { deleteNotificationAction, getNotificationsAction, markAllNotificationsReadAction, markNotificationReadAction, restoreNotificationAction } from "@/lib/customer/notificationsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/i18n/digits";

const KIND_ICON: Record<NotificationKind, { icon: typeof Bell; tone: Tone }> = {
  budget: { icon: ChartPie, tone: "warning" },
  loan: { icon: Banknote, tone: "loans" },
  savings: { icon: PiggyBank, tone: "money" },
  announcement: { icon: Megaphone, tone: "info" },
  support: { icon: MessageCircle, tone: "money" },
  reminder: { icon: AlarmClock, tone: "habits" },
  payment: { icon: CreditCard, tone: "money" },
  paymentProblem: { icon: CreditCard, tone: "expense" },
  refund: { icon: RotateCcw, tone: "info" },
  plan: { icon: CalendarClock, tone: "warning" },
  referral: { icon: Gift, tone: "money" },
  referralLost: { icon: Gift, tone: "neutral" },
  payout: { icon: Wallet, tone: "money" },
  payoutRejected: { icon: Wallet, tone: "expense" },
  securityOn: { icon: ShieldCheck, tone: "money" },
  securityOff: { icon: ShieldOff, tone: "warning" },
  securityAlert: { icon: ShieldAlert, tone: "expense" },
  campaign: { icon: Megaphone, tone: "insights" },
  idea: { icon: Lightbulb, tone: "insights" },
  zakat: { icon: HandCoins, tone: "money" },
  event: { icon: CalendarDays, tone: "warning" },
  insight: { icon: Sparkles, tone: "insights" },
  other: { icon: Bell, tone: "neutral" },
};

// While the tab is in view the feed is read again this often, so a habit
// reminder shows without a reload; and when the tab comes back into view,
// unless it was read in the last little while.
const REFRESH_EVERY_MS = 2 * 60_000;
const REFRESH_AT_MOST_EVERY_MS = 15_000;

type Filter = "all" | "unread" | "deleted";

// The bell in the top bar and its feed: budget, loan and savings reminders,
// habit reminders, announcements, and account news (billing, referrals,
// security, ideas, the team's messages), newest first. Always there, so the
// reminder settings stay one tap away; an empty feed says so. A row about
// another workspace switches to it before opening.
export function NotificationsBell({ className, badgeClassName }: { className?: string; badgeClassName?: string }) {
  const router = useRouter();
  const { t, fmt } = useLocale();
  const { user, activeBusinessId } = useAuth();
  const [items, setItems] = useState<UserNotification[]>([]);
  // The bell's Deleted tab.
  const [bin, setBin] = useState<UserNotification[]>([]);
  // The row just deleted, while its Undo shows.
  const [undo, setUndo] = useState<UserNotification | null>(null);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [, startTransition] = useTransition();

  const lastRead = useRef(0);

  // Read again each time the panel opens. A failed read keeps what is shown.
  const load = () => {
    lastRead.current = Date.now();
    return getNotificationsAction().then((result) => {
      if (!result.success || !result.data) return;
      setItems(result.data.data);
      setBin(result.data.deleted ?? []);
      setUnread(result.data.unreadCount);
    });
  };
  const loadOnMount = useEffectEvent(load);
  const loadIfStale = useEffectEvent(() => {
    if (document.visibilityState === "visible" && Date.now() - lastRead.current >= REFRESH_AT_MOST_EVERY_MS) void load();
  });

  // The first read, once the shell is up; the checks behind it may take a
  // moment and no page waits for them. Then again every two minutes while
  // the tab is in view, and when it comes back into view or focus.
  useEffect(() => {
    void loadOnMount();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void loadOnMount();
    }, REFRESH_EVERY_MS);
    const onWake = () => loadIfStale();
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, []);

  const workspaces = user.businesses.filter((business) => business.type !== "GROUP");
  const inBin = filter === "deleted";
  const shown = inBin ? bin : filter === "unread" ? items.filter((item) => !item.readAt) : items;
  const tabs: [Filter, string][] = [
    ["all", t("All")],
    ["unread", unread > 0 ? `${t("Unread")} · ${formatCount(unread, fmt)}` : t("Unread")],
    ["deleted", bin.length > 0 ? `${t("Deleted")} · ${formatCount(bin.length, fmt)}` : t("Deleted")],
  ];

  function changeOpen(next: boolean) {
    setOpen(next);
    setUndo(null);
    if (next) void load();
  }

  // Delete: out of the list at once, into Deleted, with an Undo; a refused
  // call reads the feed again.
  function remove(item: UserNotification) {
    const now = new Date().toISOString();
    setItems((current) => current.filter((row) => row.id !== item.id));
    setBin((current) => [{ ...item, deletedAt: now }, ...current]);
    if (!item.readAt) setUnread((count) => Math.max(0, count - 1));
    setUndo(item);
    void deleteNotificationAction(item.id).then((result) => {
      if (result.success) return;
      toast.error(t(result.message ?? "Couldn't delete the notification"));
      void load();
    });
  }

  // Restore, and Undo: back in the list where its date puts it, read or
  // unread as it was; the feed is read again for the true count.
  function restore(item: UserNotification, original?: UserNotification) {
    const back = original ?? { ...item, deletedAt: null };
    setBin((current) => current.filter((row) => row.id !== item.id));
    setItems((current) => [...current.filter((row) => row.id !== item.id), back].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    setUndo(null);
    void restoreNotificationAction(item.id).then((result) => {
      if (!result.success) toast.error(t(result.message ?? "Couldn't restore the notification"));
      void load();
    });
  }

  function markRead(item: UserNotification) {
    if (item.readAt) return;
    setItems((current) => current.map((row) => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)));
    setUnread((count) => Math.max(0, count - 1));
    void markNotificationReadAction(item.id);
  }

  function markAll() {
    const now = new Date().toISOString();
    setItems((current) => current.map((row) => (row.readAt ? row : { ...row, readAt: now })));
    setUnread(0);
    markAllNotificationsReadAction().then((result) => {
      // The action always brings a message (the API's, else its English
      // fallback), so that is what gets translated.
      if (!result.success) toast.error(t(result.message ?? "Failed to mark the notifications as read"));
    });
  }

  // Opens a row's page, in its own workspace.
  function openRow(event: React.MouseEvent, item: UserNotification, href: string) {
    markRead(item);
    setOpen(false);
    if (!item.businessId || item.businessId === activeBusinessId || !workspaces.some((business) => business.id === item.businessId)) return;
    event.preventDefault();
    const businessId = item.businessId;
    startTransition(async () => {
      // The server checks the workspace is still one of theirs; a PIN-locked
      // one asks for its PIN on the page itself.
      const result = await switchWorkspaceAction(businessId);
      if (!result.success) {
        toast.error(t(result.message ?? "Couldn't open that workspace. Please try again."));
        return;
      }
      router.push(href);
      router.refresh();
    });
  }

  const label = unread > 0 ? `${t("Notifications")}, ${t("{count} new", { count: formatCount(unread, fmt) })}` : t("Notifications");

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger
        aria-label={label}
        title={t("Notifications")}
        // The top bar gives it the shape of its other icon buttons.
        className={cn("relative flex shrink-0 items-center justify-center text-ink-soft transition-colors hover:text-ink", className)}
      >
        <Bell className="size-5 md:size-4.5" strokeWidth={2} aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className={cn("absolute flex items-center justify-center rounded-full bg-expense-fill font-bold text-white tabular-nums", badgeClassName)}
          >
            {formatCount(unread, fmt)}
          </span>
        )}
      </PopoverTrigger>
      {/* The AppTopbar board's panel: 400px under the bell, 60px past its right edge. */}
      <PopoverContent
        align="end"
        alignOffset={-60}
        sideOffset={6}
        className="flex max-h-[min(520px,calc(100vh-5rem))] w-[min(402px,calc(100vw-1rem))] flex-col gap-0 overflow-hidden rounded-lg border border-line bg-surface p-0 text-ink shadow-[0_18px_44px_rgba(18,32,29,0.18)] ring-0"
      >
        <div className="flex items-center gap-2.5 border-b border-divider px-4 py-3.5">
          <h2 className="grow text-[15px] leading-[normal] font-bold text-ink">{t("Notifications")}</h2>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="h-8 rounded-full px-2.5 text-[12.5px] font-semibold text-emerald hover:bg-emerald-wash">
              {t("Mark all as read")}
            </button>
          )}
          <button type="button" onClick={() => changeOpen(false)} aria-label={t("Close")} className="flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div role="group" aria-label={t("Show")} className="flex gap-1.5 px-4 pt-2.5 pb-1">
          {tabs.map(([key, text]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => {
                setFilter(key);
                setUndo(null);
              }}
              className={cn(
                "h-7.5 rounded-full border px-3 text-[12.5px] font-semibold whitespace-nowrap",
                filter === key ? "border-emerald bg-pick-wash text-emerald" : "border-line bg-surface text-ink-2 hover:bg-surface-sunken",
              )}
            >
              {text}
            </button>
          ))}
        </div>
        <ul className="min-h-0 overflow-y-auto px-2 pt-1 pb-2">
          {inBin && bin.length > 0 && (
            <li className="mx-1.5 mt-1 mb-1.5 rounded-[10px] bg-table-head px-2.5 py-2 text-[11.5px] leading-[1.45] text-ink-muted">
              {t("Notifications you delete wait here. Restore puts one back in your list. They are removed for good after 30 days.")}
            </li>
          )}
          {shown.length === 0 && <li className="px-3 py-7 text-center text-small text-ink-muted">{t(inBin ? "Nothing deleted." : "You are all caught up.")}</li>}
          {shown.map((item) => {
            const business = item.businessId ? user.businesses.find((b) => b.id === item.businessId) : undefined;
            const view = notificationView(item, t, fmt, business?.currency);
            // A kind this build has no tile for still gets the plain bell.
            const { icon: Icon, tone } = KIND_ICON[view.kind] ?? KIND_ICON.other;
            const where = business && workspaces.length > 1 ? ` · ${business.isDefault ? t("Personal") : business.name}` : "";
            const isUnread = !inBin && !item.readAt;
            const body = (
              <>
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px]", SOFT_TONE[tone])}>
                  <Icon className="size-4.25" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 grow flex-col gap-[3px]">
                  <span className={cn("text-[13.5px] leading-[normal] text-ink", isUnread ? "font-bold" : "font-medium")}>{view.title}</span>
                  <span className="text-[12.5px] leading-[1.45] text-ink-2">{view.body}</span>
                  <span className="text-[11.5px] leading-[normal] text-ink-faint">
                    {notificationTime(item.createdAt, t, fmt)}
                    {where}
                  </span>
                </span>
                {isUnread && <span aria-label={t("Unread")} className="mt-1.5 size-2.25 shrink-0 rounded-full bg-expense-fill" />}
              </>
            );
            const rowClass = "flex min-w-0 grow items-start gap-3 rounded-[12px] py-3 pr-1 pl-2.5 text-left";
            return (
              <li key={item.id} className={cn("flex items-start rounded-[12px]", isUnread ? "bg-emerald-wash" : "hover:bg-hover")}>
                <div className={cn("flex min-w-0 grow", inBin && "opacity-60")}>
                  {inBin ? (
                    <div className={rowClass}>{body}</div>
                  ) : view.href ? (
                    <Link href={view.href} onClick={(event) => openRow(event, item, view.href!)} className={rowClass}>
                      {body}
                    </Link>
                  ) : (
                    <button type="button" onClick={() => markRead(item)} className={rowClass}>
                      {body}
                    </button>
                  )}
                </div>
                {inBin ? (
                  <button
                    type="button"
                    onClick={() => restore(item)}
                    aria-label={`${t("Restore")}: ${view.title}`}
                    title={t("Restore")}
                    className="mt-2.5 mr-1.5 ml-0.5 flex h-7.5 shrink-0 items-center gap-1.25 rounded-full border border-emerald bg-surface px-2.5 text-caption font-semibold whitespace-nowrap text-emerald"
                  >
                    <RotateCcw className="size-3.75" aria-hidden="true" />
                    {t("Restore")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    aria-label={`${t("Delete")}: ${view.title}`}
                    title={t("Delete")}
                    className="mt-2.5 mr-1.5 ml-0.5 flex size-7.5 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-expense-soft hover:text-expense-fill"
                  >
                    <Trash2 className="size-3.75" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {undo && (
          <div role="status" className="mx-3 mb-2.5 flex items-center gap-2.5 rounded-[12px] bg-night-ink py-2 pr-2 pl-3.5 text-[12.5px] text-white">
            <span className="grow">{t("Notification deleted")}</span>
            <button type="button" onClick={() => restore(undo, undo)} className="h-7 rounded-full bg-white/14 px-3 text-[12.5px] font-semibold text-white hover:bg-white/22">
              {t("Undo")}
            </button>
          </div>
        )}
        <div className="border-t border-divider bg-table-head px-4 py-2.5 text-[11.5px] leading-[normal] text-ink-muted">{t("Messages from the Smartly team, sent to everyone. Delete any you don't need.")}</div>
      </PopoverContent>
    </Popover>
  );
}
