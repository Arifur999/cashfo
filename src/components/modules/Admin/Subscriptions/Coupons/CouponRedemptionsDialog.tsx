"use client";

import { useQuery } from "@tanstack/react-query";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import FormDialog from "@/components/shared/dialog/FormDialog";
import Loader from "@/components/shared/Loader";
import { formatDateTime } from "@/lib/date";
import { couponRedemptionsQuery } from "@/queries/coupon.queries";
import type { ICoupon } from "@/types/coupon.types";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";

// Fetched with TanStack Query only while open (replacing a fetch-in-effect),
// and cached per coupon for reopening.
const RedemptionsList = ({ couponId }: { couponId: string }) => {
  const { data, isLoading, isError } = useQuery(couponRedemptionsQuery(couponId));

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader label="Loading who used it" />
      </div>
    );
  }
  if (isError) {
    return <p className="py-6 text-center text-small text-expense"><T>Couldn&apos;t load who used it.</T></p>;
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
            {formatDateTime(redemption.redeemedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
};

interface CouponRedemptionsDialogProps {
  coupon: ICoupon | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CouponRedemptionsDialog = ({ coupon, open, onOpenChange }: CouponRedemptionsDialogProps) => {
  const { translate } = useLocale();
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={translate("Who used {code}", { code: coupon?.code ?? "" })}
      description={coupon ? plural(translate, coupon.timesRedeemed, "{count} use so far, newest first.", "{count} uses so far, newest first.") : undefined}
      size="sm"
    >
      {coupon && <RedemptionsList couponId={coupon.id} />}
    </FormDialog>
  );
};

export default CouponRedemptionsDialog;
