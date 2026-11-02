"use client";

import { MessageCircle, Search, Users } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import Avatar from "@/components/smartly/Avatar";
import ErrorState from "@/components/smartly/ErrorState";
import Input from "@/components/smartly/form/Input";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import { segmentClassName } from "@/components/smartly/SegmentedControl";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import { formatCurrency } from "@/lib/customer/currency";
import { dayOf, FRIEND_STANDING, FRIEND_TABS, friendDay, friendTabCounts, notPayingLine, type FriendTab } from "@/lib/customer/referralDisplay";
import type { FriendList, FriendRow } from "@/lib/customer/referralTypes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { FriendDialog } from "./FriendDialog";
import { StatusChip } from "./ReferralBits";
import { RemindDialog } from "./RemindDialog";

interface ReferredUsersClientProps {
  list: FriendList | null;
  tab: FriendTab;
  search: string;
  currency: string;
  today: string;
  // The program runs: reminders can go.
  canRemind: boolean;
}

// Person | Came from | Plan | Status | They paid | You earned | Next payment
const COLUMNS = "md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_90px_100px_110px]";

// Referrals > Referred users (ReferralUsers): everyone who signed up with
// the member's links, by how they stand, with what they paid and what each
// earned the member. The tab, search and page live in the URL. A row opens
// the friend's payments; the foot reminds those who haven't paid.
export function ReferredUsersClient({ list, tab, search, currency, today, canRemind }: ReferredUsersClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(search);
  const [loading, startLoading] = useTransition();
  const [open, setOpen] = useState<FriendRow | null>(null);
  const [reminding, setReminding] = useState(false);
  const money = (value: string | number) => formatCurrency(value, currency, fmt);
  const typed = useRef(false);

  const go = (next: { tab?: FriendTab; q?: string; page?: number }) => {
    const params = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    const nextQ = next.q ?? query;
    if (nextTab !== "ALL") params.set("tab", nextTab);
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const href = params.toString() ? `${pathname}?${params}` : pathname;
    startLoading(() => router.replace(href, { scroll: false }));
  };

  // A search runs a moment after typing stops.
  useEffect(() => {
    if (!typed.current) return;
    const timer = window.setTimeout(() => go({ q: query }), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed words start a search
  }, [query]);

  const counts = list ? friendTabCounts(list.counts) : null;
  const rows = list?.data ?? [];
  const waiting = rows.filter((row) => row.canRemind);
  const waitingLine = notPayingLine(waiting.map((row) => row.name));

  return (
    <PageFrame className="max-md:gap-3.5 max-md:pt-4 md:gap-5">
      <TopbarExtras title={t("People you brought")} />
      <PageHeader title={t("People you brought")} description={t("Everyone who signed up with your links, what they pay, and what you earn from each one.")} hideDescriptionOnPhone className="max-md:[&_h1]:sr-only" />
      {!list ? (
        <ErrorState title={t("Couldn't load the people you brought.")} onRetry={() => router.refresh()} />
      ) : (
        <ListCard
          label={t("People you brought")}
          busy={loading}
          header={
            <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 md:px-5">
              <div role="tablist" aria-label={t("Show")} className="flex max-w-full gap-1 overflow-x-auto rounded-field bg-surface-sunken p-1">
                {FRIEND_TABS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={tab === option.value}
                    onClick={() => go({ tab: option.value, page: 1 })}
                    className={segmentClassName({ variant: "soft", on: tab === option.value })}
                  >
                    {t(option.label)} <span className="text-ink-muted tabular-nums">{formatCount(counts?.[option.value] ?? 0, fmt)}</span>
                  </button>
                ))}
              </div>
              <Input
                size="md"
                type="search"
                value={query}
                onChange={(event) => {
                  typed.current = true;
                  setQuery(event.target.value);
                }}
                placeholder={t("Search by name")}
                aria-label={t("Search by name")}
                leading={<Search className="size-4 text-ink-muted" aria-hidden="true" />}
                frameClassName="ml-auto w-full rounded-full sm:w-64"
              />
            </div>
          }
          footer={
            <>
              {list.meta.totalPages > 1 && (
                <ListFooter>
                  <Pagination page={list.meta.page} totalPages={list.meta.totalPages} total={list.meta.total} pageSize={list.meta.limit} onPageChange={(page) => go({ page })} />
                </ListFooter>
              )}
              {waitingLine && canRemind && (
                <div className="flex flex-wrap items-center gap-3 border-t border-divider bg-strip px-4 py-3 md:px-5">
                  <MessageCircle className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-small text-ink-soft">{t(waitingLine.key, { ...waitingLine.values, count: formatCount(Number(waitingLine.values.count ?? 0), fmt) })}</span>
                  <button type="button" onClick={() => setReminding(true)} className="h-8.5 shrink-0 rounded-full border border-line-strong bg-surface px-3.5 text-[13px] font-semibold text-ink hover:bg-surface-sunken">
                    {t("Send a reminder")}
                  </button>
                </div>
              )}
            </>
          }
        >
          <ListHead columns={COLUMNS}>
            <ListHeadCell>{t("Person")}</ListHeadCell>
            <ListHeadCell>{t("Came from")}</ListHeadCell>
            <ListHeadCell>{t("Plan")}</ListHeadCell>
            <ListHeadCell>{t("Status")}</ListHeadCell>
            <ListHeadCell align="end">{t("They paid")}</ListHeadCell>
            <ListHeadCell align="end">{t("You earned")}</ListHeadCell>
            <ListHeadCell>{t("Next payment")}</ListHeadCell>
          </ListHead>
          {rows.length === 0 ? (
            <ListEmpty
              icon={<Users />}
              title={search ? t("No one by that name") : tab === "ALL" ? t("No one has joined with your link yet") : t("No one here yet")}
              description={tab === "ALL" && !search ? t("Share your invite link. Everyone who signs up with it shows here.") : undefined}
            />
          ) : (
            rows.map((row) => {
              const look = FRIEND_STANDING[row.standing];
              const paid = Number(row.paid) > 0;
              return (
                <ListRow key={row.id} columns={COLUMNS} density="regular" onClick={() => setOpen(row)} aria-label={t("Open {name}", { name: row.name })}>
                  <ListCell className="flex items-center gap-3 max-md:col-span-2">
                    <Avatar name={row.name} size={32} tone="soft" alt="" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold text-ink">{row.name}</span>
                      <span className="text-caption text-ink-muted">{t("Joined {date}", { date: friendDay(dayOf(row.joinedAt), today, fmt) })}</span>
                    </span>
                  </ListCell>
                  <ListCell className="truncate text-ink-2 max-md:hidden">{row.link ? row.link.label : t("Main link")}</ListCell>
                  <ListCell className={cn("truncate max-md:hidden", row.planName ? "text-ink" : "text-ink-muted")}>{row.planName ?? t("Not yet@@plan")}</ListCell>
                  <ListCell className="flex flex-col gap-0.5">
                    <StatusChip tone={look.tone}>{t(look.label)}</StatusChip>
                    <span className="truncate text-caption text-ink-muted">{standingNote(row)}</span>
                  </ListCell>
                  <ListCell align="end" className="text-ink-2 tabular-nums max-md:hidden">
                    {paid ? money(row.paid) : "—"}
                  </ListCell>
                  <ListCell align="end" className="font-bold text-ink tabular-nums">
                    {Number(row.earned) > 0 ? money(row.earned) : "—"}
                  </ListCell>
                  <ListCell className="text-ink-2 tabular-nums max-md:hidden">{row.nextPaymentAt ? friendDay(dayOf(row.nextPaymentAt), today, fmt) : "—"}</ListCell>
                </ListRow>
              );
            })
          )}
        </ListCard>
      )}
      <FriendDialog friend={open} onClose={() => setOpen(null)} currency={currency} today={today} />
      <RemindDialog
        open={reminding}
        friends={waiting}
        today={today}
        onClose={() => setReminding(false)}
        onSent={(sent, asked) => {
          setReminding(false);
          if (sent > 0) toast.success(t(sent === 1 ? "Reminder sent to {count} friend" : "Reminder sent to {count} friends", { count: formatCount(sent, fmt) }));
          if (sent < asked) toast(t("Some friends were reminded this week already. They get one reminder a week."));
        }}
      />
    </PageFrame>
  );

  // The line under the chip: the friend's plan rhythm, why they stopped,
  // or that they are on the Free plan.
  function standingNote(row: FriendRow): string {
    switch (row.standing) {
      case "PAYING":
        return row.nextPaymentAt ? t("Renews {date}", { date: friendDay(dayOf(row.nextPaymentAt), today, fmt) }) : t("Won't renew");
      case "FREE":
        return t("On the Free plan");
      case "STOPPED":
        return t("Didn't renew");
      case "REFUNDED":
        return t("Every payment refunded");
      case "BLOCKED":
        return row.blockedReason === "MONTHLY_LIMIT" ? t("Over the monthly limit") : t("Your own sign-up doesn't count");
    }
  }
}
