"use client";

import { useQuery } from "@tanstack/react-query";
import Loader from "@/components/shared/Loader";
import UserInfoCell from "@/components/shared/cell/UserInfoCell";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime } from "@/lib/date";
import { couponRedemptionsQuery } from "@/queries/coupon.queries";
import type { ICoupon } from "@/types/coupon.types";

// Fetched with TanStack Query only while open (replacing a fetch-in-effect),
// and cached per coupon for reopening.
const RedemptionsList = ({ couponId }: { couponId: string }) => {
  const { data, isLoading, isError } = useQuery(couponRedemptionsQuery(couponId));

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader label="Loading redemptions" />
      </div>
    );
  }
  if (isError) {
    return <p className="py-6 text-center text-sm text-destructive">Couldn&apos;t load redemptions.</p>;
  }
  if (!data || data.data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No redemptions yet.</p>;
  }

  return (
    <ScrollArea className="max-h-80">
      <ul className="space-y-3 pr-3">
        {data.data.map((redemption) => (
          <li key={redemption.id} className="rounded-xl border p-3">
            <UserInfoCell name={redemption.platformUser?.name} email={redemption.platformUser?.email} />
            <p className="mt-2 text-xs text-muted-foreground">
              {redemption.plan.name} &middot; {formatDateTime(redemption.redeemedAt)}
            </p>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
};

interface CouponRedemptionsDialogProps {
  coupon: ICoupon | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CouponRedemptionsDialog = ({ coupon, open, onOpenChange }: CouponRedemptionsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redemptions</DialogTitle>
          <DialogDescription className="font-mono">{coupon?.code}</DialogDescription>
        </DialogHeader>
        {coupon && <RedemptionsList couponId={coupon.id} />}
      </DialogContent>
    </Dialog>
  );
};

export default CouponRedemptionsDialog;
