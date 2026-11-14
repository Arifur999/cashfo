"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import Loader from "@/components/shared/Loader";
import Avatar from "@/components/smartly/Avatar";
import Button from "@/components/smartly/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/customer/currency";
import { getFriendDetailAction } from "@/lib/customer/referralActions";
import { dayOf, FRIEND_STANDING, friendDay, KIND_LABEL } from "@/lib/customer/referralDisplay";
import { formatDate } from "@/lib/date";
import type { FriendDetail, FriendRow } from "@/lib/customer/referralTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CommissionStatusCell } from "./CommissionStatusCell";
import { StatusChip } from "./ReferralBits";

// A friend known only by name (an Earnings row): the rest loads in the popup.
export interface FriendStub {
  // The referral's id.
  id: string;
  name: string;
}

interface FriendDialogProps {
  friend: FriendRow | FriendStub | null;
  onClose: () => void;
  currency: string;
  today: string;
}

// One friend (ReferralDashboard's user popup): how they stand, what they
// paid and earned the member, and every payment with the member's share.
export function FriendDialog({ friend, onClose, currency, today }: FriendDialogProps) {
  const { t, fmt } = useLocale();
  const [detail, setDetail] = useState<{ id: string; data: FriendDetail | null } | null>(null);
  const money = (value: string | number) => formatCurrency(value, currency, fmt);

  useEffect(() => {
    if (!friend) return;
    let live = true;
    void getFriendDetailAction(friend.id)
      .catch(() => null)
      .then((result) => {
        if (live) setDetail({ id: friend.id, data: result?.success && result.data ? result.data : null });
      });
    return () => {
      live = false;
    };
  }, [friend]);

  const loaded = friend && detail?.id === friend.id ? detail : null;
  const shown = loaded?.data ?? (friend && "standing" in friend ? friend : null);
  const look = shown ? FRIEND_STANDING[shown.standing] : null;

  return (
    <Dialog open={friend !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="flex max-h-[min(840px,calc(100dvh-32px))] w-150 max-w-[calc(100vw-32px)] flex-col gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 leading-[normal] shadow-overlay ring-0 sm:max-w-150">
        {friend && !shown && (
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <Avatar name={friend.name} size={44} tone="soft" alt="" />
            <DialogTitle className="text-h3 text-ink">{friend.name}</DialogTitle>
            {loaded ? <DialogDescription className="text-small text-expense">{t("Couldn't load this friend.")}</DialogDescription> : <Loader size={20} label={t("Loading...")} />}
            <Button variant="secondary" onClick={onClose}>
              {t("Close")}
            </Button>
          </div>
        )}
        {shown && look && (
          <>
            <div className="flex items-center gap-3 border-b border-line px-6 py-4.5">
              <Avatar name={shown.name} size={44} tone="soft" alt="" className="size-10.5" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.75">
                <DialogTitle className="truncate text-[17px] font-semibold text-ink">{shown.name}</DialogTitle>
                <DialogDescription className="text-[12.5px] text-ink-muted">
                  {[t("Joined {date}", { date: friendDay(dayOf(shown.joinedAt), today, fmt) }), shown.link ? t("came from {link}", { link: shown.link.label }) : t("came from your main link")].join(" · ")}
                </DialogDescription>
              </div>
              <StatusChip tone={look.tone} size="md">
                {t(look.label)}
              </StatusChip>
              <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
                <X className="size-4.5" aria-hidden="true" />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-divider sm:grid-cols-4">
              {[
                { label: t("Plan"), value: shown.planName ?? t("Free") },
                { label: t("They paid"), value: Number(shown.paid) > 0 ? money(shown.paid) : "—" },
                { label: t("You earned"), value: Number(shown.earned) > 0 ? money(shown.earned) : "—", accent: Number(shown.earned) > 0 },
                { label: t("Next payment"), value: shown.nextPaymentAt ? formatDate(shown.nextPaymentAt, shown.nextPaymentAt.slice(0, 4) === today.slice(0, 4) ? "d MMM" : "d MMM yy", "—", fmt) : "—" },
              ].map((stat) => (
                <div key={stat.label} className="flex min-w-0 flex-col gap-0.75 bg-surface px-4.5 py-3.5">
                  <dt className="text-caption text-ink-muted">{stat.label}</dt>
                  <dd className={cn("truncate text-[16px] font-bold tabular-nums", stat.accent ? "text-emerald" : "text-ink")}>{stat.value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-6 pt-3.5 pb-4.5">
              <h3 className="text-[13px] font-semibold text-ink-2">{t("Every payment and your share")}</h3>
              {!loaded ? (
                <div className="flex justify-center py-6">
                  <Loader size={20} label={t("Loading...")} />
                </div>
              ) : !loaded.data ? (
                <p className="rounded-md bg-strip p-4 text-[13.5px] text-expense">{t("Couldn't load this friend.")}</p>
              ) : loaded.data.payments.length === 0 ? (
                <p className="rounded-md bg-strip p-4 text-[13.5px] leading-normal text-ink-soft">{t("No payments yet. They are on the Free plan.")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {loaded.data.payments.map((payment) => (
                    <li key={payment.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-field border border-surface-sunken px-3 py-2.5 text-[13.5px] tabular-nums sm:grid-cols-[90px_minmax(0,1fr)_84px_140px]">
                      <span className="text-ink-soft max-sm:hidden">{formatDate(payment.paidAt, payment.paidAt.slice(0, 4) === today.slice(0, 4) ? "d MMM" : "d MMM yy", "", fmt)}</span>
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className="truncate font-semibold text-ink">{[payment.planName, money(payment.paidAmount)].filter(Boolean).join(" · ")}</span>
                        <span className="truncate text-caption text-ink-muted">{payment.kind === "FIRST" ? t("First payment") : t(KIND_LABEL[payment.kind])}</span>
                      </span>
                      <span className={cn("text-right font-bold", payment.status === "REVERSED" || payment.status === "CANCELLED" ? "text-ink-muted line-through" : "text-ink")}>{money(payment.amount)}</span>
                      <CommissionStatusCell line={payment} today={today} align="end" className="max-sm:col-span-2" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end border-t border-line bg-strip px-6 py-3.5">
              <Button onClick={onClose} className="h-10 px-4.5">
                {t("Done")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
