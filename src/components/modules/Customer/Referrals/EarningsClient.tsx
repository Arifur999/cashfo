"use client";

import { ArrowDownToLine, Download, Receipt } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TopbarExtras } from "@/components/modules/Customer/Layout/TopbarExtras";
import ErrorState from "@/components/smartly/ErrorState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import Pagination from "@/components/smartly/Pagination";
import { PeriodPicker, periodLabel } from "@/components/modules/Customer/Shared/PeriodPicker";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow } from "@/components/smartly/list";
import { formatCurrency } from "@/lib/customer/currency";
import { periodHref, periodRange, type PickedPeriod } from "@/lib/customer/period";
import { balancesOf, COMMISSION_STATUS, EARNING_CARDS, KIND_LABEL, programOf } from "@/lib/customer/referralDisplay";
import type { CommissionStatus, EarningList, ReferralProgramInfo } from "@/lib/customer/referralTypes";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CommissionStatusCell } from "./CommissionStatusCell";
import { FriendDialog, type FriendStub } from "./FriendDialog";
import { WITHDRAW_ROUTE } from "./EarningsHero";

interface EarningsClientProps {
  info: ReferralProgramInfo | null;
  list: EarningList | null;
  status: CommissionStatus | null;
  period: PickedPeriod;
  currency: string;
  today: string;
}

const ALL_TIME: PickedPeriod = { kind: "all" };

// Date | From | For | They paid | Your share | Status | Payment ID
const COLUMNS = "md:grid-cols-[96px_minmax(0,1fr)_150px_96px_96px_170px_110px]";

// The lines whose money counts toward "Your share".
const COUNTED: CommissionStatus[] = ["ON_HOLD", "AVAILABLE", "IN_WITHDRAWAL", "UNDER_CHECK", "PAID_OUT"];

// The dot before each filter card's label.
const CARD_DOT: Record<CommissionStatus, string> = {
  AVAILABLE: "bg-emerald",
  ON_HOLD: "bg-warning-fill",
  IN_WITHDRAWAL: "bg-info",
  UNDER_CHECK: "bg-orange-fill",
  PAID_OUT: "bg-emerald",
  REVERSED: "bg-expense-fill",
  CANCELLED: "bg-ink-faint",
};

// The line under each card's amount.
const CARD_NOTE: Record<CommissionStatus, string> = {
  AVAILABLE: "Ready to withdraw",
  ON_HOLD: "{days} days after each payment",
  IN_WITHDRAWAL: "Being checked",
  UNDER_CHECK: "Held back for a check",
  PAID_OUT: "Sent to you",
  REVERSED: "Refunded payments",
  CANCELLED: "Not counted",
};

// Referrals > Earnings (ReferralEarnings): every payment the member's
// friends made and the member's share of it, newest first. The cards are
// the totals by status and filter the list; the Choose period picker narrows
// it (the cards too); the statement downloads what is shown. All of it lives
// in the URL.
export function EarningsClient({ info, list, status, period, currency, today }: EarningsClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, startLoading] = useTransition();
  const [friend, setFriend] = useState<FriendStub | null>(null);
  const money = (value: string | number) => formatCurrency(value, currency, fmt);
  const program = info ? programOf(info) : null;
  const available = info ? balancesOf(info).available : 0;
  const pct = program ? `${formatCount(program.commissionPct, fmt)}%` : "";

  const query = (next: { status?: CommissionStatus | null; period?: PickedPeriod; page?: number }) => {
    const s = next.status === undefined ? status : next.status;
    const params = new URLSearchParams(periodHref("", s ? { status: s } : {}, next.period ?? period).slice(1));
    if (next.page && next.page > 1) params.set("page", String(next.page));
    return params.toString();
  };
  const go = (next: Parameters<typeof query>[0]) => {
    const q = query(next);
    startLoading(() => router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false }));
  };
  const range = periodRange(period);
  const exportQuery = new URLSearchParams({ ...(status && { status }), ...(range.dateFrom && { dateFrom: range.dateFrom }), ...(range.dateTo && { dateTo: range.dateTo }) }).toString();
  const statement = `/api/referrals/earnings/export${exportQuery ? `?${exportQuery}` : ""}`;
  const narrowed = status !== null || period.kind !== "all";
  // The foot's "Your share": every line the filters keep (all pages), less
  // the refunded and cancelled ones.
  const shareShown = list ? (status ? [status] : COUNTED).filter((s) => COUNTED.includes(s)).reduce((sum, s) => sum + Number(list.totals[s].amount), 0) : 0;
  const dayLabel = (at: string) => formatDate(at, at.slice(0, 4) === today.slice(0, 4) ? "d MMM" : "d MMM yyyy", "", fmt);

  return (
    <PageFrame className="max-md:gap-3.5 max-md:pt-4 md:gap-[18px] leading-[normal] md:pt-6 md:pb-8">
      <TopbarExtras heading={t("Earnings")} />
      <PageHeader
        title={t("Earnings")}
        description={t("Every payment your friends made and your {pct} from it.", { pct })}
        hideDescriptionOnPhone
        className="max-md:[&_h1]:sr-only"
        actions={
          <div className="flex flex-wrap gap-2">
            <a href={statement} className="flex h-10 items-center gap-2 rounded-full border border-input bg-surface px-3.5 text-body font-semibold text-ink hover:bg-surface-sunken">
              <Download className="size-3.75 text-ink-2" aria-hidden="true" />
              {t("Download statement")}
            </a>
            <Link href={WITHDRAW_ROUTE} className="flex h-10 items-center gap-2 rounded-full bg-emerald px-4 text-body font-semibold text-on-action shadow-button hover:bg-emerald-hover">
              <ArrowDownToLine className="size-4" strokeWidth={2.25} aria-hidden="true" />
              {t("Withdraw {amount}", { amount: money(available) })}
            </Link>
          </div>
        }
      />
      {!list ? (
        <ErrorState title={t("Couldn't load your earnings.")} onRetry={() => router.refresh()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-5">
            {EARNING_CARDS.map((key) => {
              const on = status === key;
              const total = list.totals[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => go({ status: on ? null : key, page: 1 })}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(18,32,29,0.04)] transition-colors",
                    on ? "border-[1.5px] border-emerald bg-emerald-soft" : "border border-line-card bg-surface hover:border-line-strong",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-[12.5px] leading-[normal] text-ink-muted">
                    <span aria-hidden="true" className={cn("size-2 rounded-full", CARD_DOT[key])} />
                    {t(COMMISSION_STATUS[key].label)}
                  </span>
                  <span className="text-[20px] leading-[normal] font-bold text-ink tabular-nums">{money(total.amount)}</span>
                  <span className="text-caption text-ink-muted">{t(CARD_NOTE[key], { days: formatCount(program?.holdDays ?? 7, fmt) })}</span>
                </button>
              );
            })}
          </div>
          {(list.totals.UNDER_CHECK.count > 0 || status === "UNDER_CHECK") && (
            <button type="button" onClick={() => go({ status: status === "UNDER_CHECK" ? null : "UNDER_CHECK", page: 1 })} className="flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] text-ink-soft hover:border-line-strong">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-orange-fill" />
              {t("Under check: {amount} held back for a second look", { amount: money(list.totals.UNDER_CHECK.amount) })}
            </button>
          )}

          <ListCard
            label={t("All commissions")}
            busy={loading}
            header={
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5">
                <h2 className="min-w-0 flex-1 text-body-strong text-ink">
                  {status ? t(COMMISSION_STATUS[status].label) : t("All commissions")}
                  {period.kind !== "all" && ` · ${periodLabel(period, t, fmt)}`}
                </h2>
                <PeriodPicker period={period} today={today} activeMonths={list.activeMonths ?? null} allowAll defaultPeriod={ALL_TIME} busy={loading} onPick={(next) => go({ period: next, page: 1 })} />
              </div>
            }
            footer={
              list.meta.total > 0 && (
                <ListFooter className="gap-3 border-t-0 bg-strip py-3 md:px-5">
                  <div className="flex items-center justify-between gap-3 text-[13.5px] leading-[normal] tabular-nums">
                    <span className="text-ink-2">{t(list.meta.total === 1 ? "{count} payment shown" : "{count} payments shown", { count: formatCount(list.meta.total, fmt) })}</span>
                    <b className="font-bold text-ink">{t("Your share {amount}", { amount: money(shareShown) })}</b>
                  </div>
                  {list.meta.totalPages > 1 && <Pagination page={list.meta.page} totalPages={list.meta.totalPages} total={list.meta.total} pageSize={list.meta.limit} onPageChange={(page) => go({ page })} />}
                </ListFooter>
              )
            }
          >
            <ListHead columns={COLUMNS} className="h-[35px] gap-x-3.5 border-t md:px-5">
              <ListHeadCell>{t("Date")}</ListHeadCell>
              <ListHeadCell>{t("From@@referral")}</ListHeadCell>
              <ListHeadCell>{t("For@@referral")}</ListHeadCell>
              <ListHeadCell align="end">{t("They paid")}</ListHeadCell>
              <ListHeadCell align="end">{t("Your {pct}", { pct })}</ListHeadCell>
              <ListHeadCell>{t("Status")}</ListHeadCell>
              <ListHeadCell>{t("Payment ID")}</ListHeadCell>
            </ListHead>
            {list.data.length === 0 ? (
              <ListEmpty icon={<Receipt />} title={narrowed ? t("Nothing here for this filter.") : t("No commissions yet")} description={narrowed ? undefined : t("When a friend pays, the payment and your share show here.")} />
            ) : (
              list.data.map((line) => {
                const gone = line.status === "REVERSED" || line.status === "CANCELLED";
                return (
                  <ListRow key={line.id} columns={COLUMNS} density="relaxed" className="gap-x-3.5 md:min-h-13 md:px-5">
                    <ListCell className="text-ink-2 tabular-nums max-md:hidden">{dayLabel(line.paidAt)}</ListCell>
                    <ListCell className="flex min-w-0 flex-col items-start">
                      <button type="button" onClick={() => setFriend({ id: line.referralId, name: line.friendName })} className="max-w-full truncate rounded-sm text-left font-semibold text-ink hover:underline">
                        {line.friendName}
                      </button>
                      <span className="truncate text-caption text-ink-muted md:hidden">
                        {dayLabel(line.paidAt)} · {line.planName ?? t(KIND_LABEL[line.kind])}
                      </span>
                    </ListCell>
                    <ListCell className="flex min-w-0 flex-col max-md:hidden">
                      <span className="truncate text-ink">{line.planName ?? t(KIND_LABEL[line.kind])}</span>
                      <span className="truncate text-caption text-ink-muted">
                        {line.kind === "FIRST" && program?.friendDiscountPct ? t("First payment · {pct}% off", { pct: formatCount(program.friendDiscountPct, fmt) }) : t(KIND_LABEL[line.kind])}
                      </span>
                    </ListCell>
                    <ListCell align="end" className="text-ink-2 tabular-nums max-md:hidden">
                      {Number(line.paidAmount) > 0 ? money(line.paidAmount) : "—"}
                    </ListCell>
                    <ListCell align="end" className={cn("font-bold tabular-nums", gone ? "text-ink-muted line-through" : "text-ink")}>
                      {money(line.amount)}
                    </ListCell>
                    <ListCell className="max-md:col-span-2">
                      <CommissionStatusCell line={line} today={today} />
                    </ListCell>
                    <ListCell className="truncate font-mono text-caption text-ink-muted max-md:hidden">{line.paymentDisplayId ?? "—"}</ListCell>
                  </ListRow>
                );
              })
            )}
          </ListCard>
        </>
      )}
      <FriendDialog friend={friend} onClose={() => setFriend(null)} currency={currency} today={today} />
    </PageFrame>
  );
}
