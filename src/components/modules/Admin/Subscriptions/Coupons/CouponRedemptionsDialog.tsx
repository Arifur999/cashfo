"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import FormDialog from "@/components/shared/dialog/FormDialog";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { countPhrase } from "@/components/modules/Admin/Payments/paymentsDisplay";
import { formatDate } from "@/lib/date";
import { couponRedemptionsQuery } from "@/queries/coupon.queries";
import type { ICoupon } from "@/types/coupon.types";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// Fetched with TanStack Query only while open (replacing a fetch-in-effect),
// and cached per coupon for reopening.
const RedemptionsList = ({ couponId }: { couponId: string }) => {
  const { data, isLoading, isError, refetch } = useQuery(couponRedemptionsQuery(couponId));
  const { locale } = useLocale();

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader label="Loading who used it" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="text-small text-expense"><T>Couldn&apos;t load who used it.</T></p>
        <Button variant="secondary" size="sm" onClick={() => void refetch()}>
          <RefreshCw aria-hidden="true" />
          <T>Try again</T>
        </Button>
      </div>
    );
  }
  if (!data || data.data.length === 0) {
    return <p className="py-6 text-center text-small text-ink-muted"><T>Nobody has used it yet.</T></p>;
  }

  return (
    <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
      {data.data.map((redemption) => (
        <li key={redemption.id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5">
          <UserInfoCell name={redemption.platformUser?.name} email={redemption.platformUser?.email} />
          <span className="shrink-0 text-right text-caption text-ink-muted">
            {redemption.plan.name}
            <br />
            {/* The area's own way of writing a moment: "1 Oct 2026, 10:14 am". */}
            {formatDate(redemption.redeemedAt, "d MMM yyyy, h:mm aaa", "—", locale)}
          </span>
        </li>
      ))}
    </ul>
  );
};

interface CouponRedemptionsDialogProps {
  // Kept by the table after the dialog closes, so the title stays put.
  coupon: ICoupon | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CouponRedemptionsDialog = ({ coupon, open, onOpenChange }: CouponRedemptionsDialogProps) => {
  const { translate, locale } = useLocale();
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={translate("Who used {code}", { code: coupon?.code ?? "" })}
      description={coupon ? countPhrase(translate, locale, coupon.timesRedeemed, "{count} use so far, newest first.", "{count} uses so far, newest first.") : undefined}
      size="sm"
      // It only shows who used the code: a click outside closes it.
      closeOnOutsideClick
    >
      {coupon && <RedemptionsList couponId={coupon.id} />}
    </FormDialog>
  );
};

export default CouponRedemptionsDialog;
