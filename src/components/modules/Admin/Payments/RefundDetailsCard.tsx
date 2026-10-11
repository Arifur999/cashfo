import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import SectionCard from "@/components/shared/SectionCard";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import type { IRefund } from "@/types/payment.types";

const RefundDetailsCard = ({ refund, currency }: { refund: IRefund; currency: string }) => {
  return (
    <SectionCard title="Refund" action={<StatusBadgeCell status={refund.status} />}>
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground uppercase">Amount</dt>
          <dd className="mt-0.5 font-medium tabular-nums">{formatCurrency(refund.amount, currency)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground uppercase">Date</dt>
          <dd className="mt-0.5">{formatDateTime(refund.createdAt)}</dd>
        </div>
        <div className="sm:col-span-3">
          <dt className="text-xs text-muted-foreground uppercase">Reason</dt>
          <dd className="mt-0.5">{refund.reason}</dd>
        </div>
      </dl>
    </SectionCard>
  );
};

export default RefundDetailsCard;
