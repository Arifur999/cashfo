import Card from "@/components/smartly/Card";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { formatAmount } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { IRefund } from "@/types/payment.types";
import T from "@/components/shared/T";

// The refund that went out: how much, when, and why.
const RefundDetailsCard = ({ refund, currency }: { refund: IRefund; currency: string }) => {
  return (
    <Card asChild padding="md" className="flex flex-col gap-3">
      <section aria-labelledby="refund">
        <div className="flex items-center justify-between gap-3">
          <h2 id="refund" className="text-title text-ink">
            <T>Refund</T>
          </h2>
          <StatusBadgeCell status={refund.status} />
        </div>
        <p className="text-body text-ink">
          <T values={{ amount: <b className="font-semibold tabular-nums">{formatAmount(refund.amount, currency)}</b>, date: formatDate(refund.createdAt, "d MMM yyyy, h:mm aaa") }}>
            {"{amount} sent back on {date}."}
          </T>
        </p>
        <p className="text-body text-ink-2">{refund.reason}</p>
      </section>
    </Card>
  );
};

export default RefundDetailsCard;
