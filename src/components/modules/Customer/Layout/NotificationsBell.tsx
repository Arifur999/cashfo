"use client";

import {
  AlarmClock,
  Banknote,
  Bell,
  CalendarClock,
  ChartPie,
  CheckCheck,
  CreditCard,
  Gift,
  Lightbulb,
  Megaphone,
  MessageCircle,
  PiggyBank,
  RotateCcw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/modules/Customer/Providers/AuthProvider";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import StatePanel from "@/components/smartly/StatePanel";
import { SOFT_TONE, type Tone } from "@/components/smartly/tones";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { UserNotification } from "@/lib/customer/api";
import { switchWorkspaceAction } from "@/lib/customer/businessActions";
import { notificationTime, notificationView, type NotificationKind } from "@/lib/customer/notificationDisplay";
import { getNotificationsAction, markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/customer/notificationsActions";
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
  other: { icon: Bell, tone: "neutral" },
};

// While the tab is in view the feed is read again this often, so a habit
// reminder shows without a reload; and when the tab comes back into view,
// unless it was read in the last little while.
const REFRESH_EVERY_MS = 2 * 60_000;
const REFRESH_AT_MOST_EVERY_MS = 15_000;

type Filter = "all" | "unread";

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
  const shown = filter === "unread" ? items.filter((item) => !item.readAt) : items;

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) void load();
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
      <PopoverContent align="end" sideOffset={8} className="w-[min(25rem,calc(100vw-1rem))] gap-0 overflow-hidden rounded-lg border border-line bg-surface p-0 text-ink shadow-overlay ring-0">
        <div className="flex items-center justify-between gap-3 p-4">
          <h2 className="text-title font-bold text-ink">{t("Notifications")}</h2>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="text-small font-semibold text-emerald hover:underline">
              {t("Mark all as read")}
            </button>
          )}
        </div>
        {/* Nothing to filter in an empty feed. */}
        {items.length > 0 && (
          <div className="px-4 pb-3">
            <SegmentedControl
              label={t("Show")}
              value={filter}
              onChange={setFilter}
              className="[&>button]:h-7.5"
              options={[
                { value: "all", label: t("All") },
                { value: "unread", label: unread > 0 ? `${t("Unread")} ${formatCount(unread, fmt)}` : t("Unread") },
              ]}
            />
          </div>
        )}
        <ul className="max-h-[min(30rem,calc(100vh-14rem))] overflow-y-auto">
          {shown.length === 0 && (
            <li className="border-t border-divider">
              <StatePanel icon={<CheckCheck />} tone="money" title={t("You're all caught up.")} bordered={false} className="py-8" />
            </li>
          )}
          {shown.map((item) => {
            const business = item.businessId ? user.businesses.find((b) => b.id === item.businessId) : undefined;
            const view = notificationView(item, t, fmt, business?.currency);
            // A kind this build has no tile for still gets the plain bell.
            const { icon: Icon, tone } = KIND_ICON[view.kind] ?? KIND_ICON.other;
            const where = business && workspaces.length > 1 ? ` · ${business.isDefault ? t("Personal") : business.name}` : "";
            const body = (
              <>
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", SOFT_TONE[tone])}>
                  <Icon className="size-4.25" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <b className="text-body font-semibold text-ink">{view.title}</b>
                  <span className="text-small leading-4.5 text-ink-2">{view.body}</span>
                  <span className="text-caption text-ink-muted">
                    {notificationTime(item.createdAt, t, fmt)}
                    {where}
                  </span>
                </span>
                {!item.readAt && <span aria-label={t("Unread")} className="mt-2 size-2 shrink-0 rounded-full bg-emerald" />}
              </>
            );
            const rowClass = cn("flex w-full gap-3 border-t border-divider p-4 text-left", item.readAt ? "bg-surface hover:bg-hover" : "bg-mint-50 hover:bg-mint-200/40");
            return (
              <li key={item.id}>
                {view.href ? (
                  <Link href={view.href} onClick={(event) => openRow(event, item, view.href!)} className={rowClass}>
                    {body}
                  </Link>
                ) : (
                  <button type="button" onClick={() => markRead(item)} className={rowClass}>
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <Link
          href="/settings/app"
          onClick={() => setOpen(false)}
          className="flex h-12 items-center justify-center gap-2 border-t border-line bg-strip text-small font-semibold text-ink-2 hover:text-ink"
        >
          <Settings className="size-4" aria-hidden="true" />
          {t("Choose what you're told about")}
        </Link>
      </PopoverContent>
    </Popover>
  );
}
