import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import type { IPaymentDetail } from "@/types/payment.types";

interface PaymentSummaryHeaderProps {
  payment: IPaymentDetail;
  actions?: React.ReactNode;
}

const PaymentSummaryHeader = ({ payment, actions }: PaymentSummaryHeaderProps) => {
  return (
    <Card className="shadow-sm shadow-black/5">
      <CardContent className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(payment.amount, payment.currency)}</h1>
            <StatusBadgeCell status={payment.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {payment.platformUser?.name ?? "Unknown user"}
            {payment.platformUser?.email && <> &middot; {payment.platformUser.email}</>}
          </p>
          <p className="text-xs text-muted-foreground">Created {formatDateTime(payment.createdAt)}</p>
        </div>
        {actions}
      </CardContent>
    </Card>
  );
};

export default PaymentSummaryHeader;
