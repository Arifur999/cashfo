"use client";

import { Banknote, Bell, ChartPie, CheckCheck, Megaphone, MessageCircle, PiggyBank, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
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

const KIND_ICON: Record<NotificationKind, { icon: typeof Bell; tone: Tone }> = {
  budget: { icon: ChartPie, tone: "warning" },
  loan: { icon: Banknote, tone: "loans" },
  savings: { icon: PiggyBank, tone: "money" },
  announcement: { icon: Megaphone, tone: "info" },
  support: { icon: MessageCircle, tone: "money" },
};

type Filter = "all" | "unread";

// The bell in the top bar and its feed: budget, loan and savings reminders
// and announcements, newest first. Always there, so the reminder settings
// stay one tap away; an empty feed says so. A row about another workspace
// switches to it before opening.
export function NotificationsBell() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { user, activeBusinessId } = useAuth();
  const [items, setItems] = useState<UserNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [, startTransition] = useTransition();

  // Read again each time the panel opens. A failed read keeps what is shown.
  const load = () =>
    getNotificationsAction().then((result) => {
      if (!result.success || !result.data) return;
      setItems(result.data.data);
      setUnread(result.data.unreadCount);
    });
  const loadOnMount = useEffectEvent(load);

  // The first read, once the shell is up; the checks behind it may take a
  // moment and no page waits for them.
  useEffect(() => {
    void loadOnMount();
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
            className="absolute top-1 right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-expense-fill px-1 text-caption leading-4 font-bold text-white tabular-nums shadow-[0_0_0_2px_var(--surface)] md:-top-1.25 md:-right-1.25"
          >
            {unread}
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
              label="Show"
              value={filter}
              onChange={setFilter}
              className="[&>button]:h-7.5"
              options={[
                { value: "all", label: t("All") },
                { value: "unread", label: unread > 0 ? `${t("Unread")} ${unread}` : t("Unread") },
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
            const view = notificationView(item, t, locale, business?.currency);
            const { icon: Icon, tone } = KIND_ICON[view.kind];
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
                    {notificationTime(item.createdAt, t)}
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
