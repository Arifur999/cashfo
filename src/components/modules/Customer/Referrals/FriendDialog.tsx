"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import Loader from "@/components/shared/Loader";
import Avatar from "@/components/smartly/Avatar";
import Button from "@/components/smartly/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/customer/currency";
import { getFriendDetailAction } from "@/lib/customer/referralActions";
import { dayOf, FRIEND_STANDING, friendDay } from "@/lib/customer/referralDisplay";
import type { FriendDetail, FriendRow } from "@/lib/customer/referralTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CommissionStatusCell } from "./CommissionStatusCell";
import { useEarningLine } from "./DashboardCards";
import { StatusChip } from "./ReferralBits";

interface FriendDialogProps {
  friend: FriendRow | null;
  onClose: () => void;
  currency: string;
  today: string;
}

// One friend (ReferralDashboard's user popup): how they stand, what they
// paid and earned the member, and every payment with the member's share.
export function FriendDialog({ friend, onClose, currency, today }: FriendDialogProps) {
  const { t, fmt } = useLocale();
  const describe = useEarningLine();
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
  const shown = loaded?.data ?? friend;
  const look = shown ? FRIEND_STANDING[shown.standing] : null;

  return (
    <Dialog open={friend !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} className="w-140 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-[20px] border-0 bg-surface p-0 shadow-overlay ring-0">
        {shown && look && (
          <>
            <div className="flex items-start gap-3 px-6 pt-5">
              <Avatar name={shown.name} size={44} tone="soft" alt="" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <DialogTitle className="truncate text-h3 text-ink">{shown.name}</DialogTitle>
                <DialogDescription className="text-small text-ink-muted">
                  {[t("Joined {date}", { date: friendDay(dayOf(shown.joinedAt), today, fmt) }), shown.link ? shown.link.label : t("Main link")].join(" · ")}
                </DialogDescription>
              </div>
              <StatusChip tone={look.tone} size="md" className="mt-1">
                {t(look.label)}
              </StatusChip>
              <button type="button" onClick={onClose} aria-label={t("Close")} className="-mt-1 -mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-sunken hover:text-ink">
                <X className="size-4.5" aria-hidden="true" />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-2 px-6 pt-4 sm:grid-cols-4">
              {[
                { label: t("Plan"), value: shown.planName ?? t("Free") },
                { label: t("They paid"), value: Number(shown.paid) > 0 ? money(shown.paid) : "—" },
                { label: t("You earned"), value: Number(shown.earned) > 0 ? money(shown.earned) : "—" },
                { label: t("Next payment"), value: shown.nextPaymentAt ? friendDay(dayOf(shown.nextPaymentAt), today, fmt) : "—" },
              ].map((stat) => (
                <div key={stat.label} className="flex min-w-0 flex-col gap-0.5 rounded-field bg-strip px-3 py-2.5">
                  <dt className="text-caption text-ink-muted">{stat.label}</dt>
                  <dd className="truncate text-body font-bold text-ink tabular-nums">{stat.value}</dd>
                </div>
              ))}
            </dl>
            <h3 className="px-6 pt-4 pb-2 text-small font-semibold text-ink-2">{t("Every payment and your share")}</h3>
            <div className="max-h-72 overflow-y-auto border-t border-divider">
              {!loaded ? (
                <div className="flex justify-center py-6">
                  <Loader size={20} label={t("Loading...")} />
                </div>
              ) : !loaded.data ? (
                <p className="px-6 py-4 text-small text-expense">{t("Couldn't load this friend.")}</p>
              ) : loaded.data.payments.length === 0 ? (
                <p className="px-6 py-4 text-small text-ink-muted">{t("No payments yet. They are on the Free plan.")}</p>
              ) : (
                <ul>
                  {loaded.data.payments.map((payment) => (
                    <li key={payment.id} className="flex items-center gap-3 border-b border-divider px-6 py-2.5 last:border-b-0">
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-body text-ink">{describe(payment, today)}</span>
                        <span className="text-caption text-ink-muted tabular-nums">{t("paid {amount}", { amount: money(payment.paidAmount) })}</span>
                      </span>
                      <span className={cn("text-body font-bold tabular-nums", payment.status === "REVERSED" || payment.status === "CANCELLED" ? "text-ink-muted line-through" : "text-ink")}>{money(payment.amount)}</span>
                      <CommissionStatusCell line={payment} today={today} align="end" className="w-32 shrink-0" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end border-t border-line bg-strip px-6 py-3.5">
              <Button variant="secondary" onClick={onClose}>
                {t("Done")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
