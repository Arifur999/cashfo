import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import type { IRefund } from "@/types/payment.types";
import T from "@/components/shared/T";

// The refund that went out: how much, when, and why.
const RefundDetailsCard = ({ refund, currency }: { refund: IRefund; currency: string }) => {
  return (
    <section aria-labelledby="refund" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 id="refund" className="text-title text-ink">
          <T>Refund</T>
        </h2>
        <StatusBadgeCell status={refund.status} />
      </div>
      <p className="text-body text-ink">
        <T values={{ amount: <b className="font-semibold tabular-nums">{formatCurrency(refund.amount, currency)}</b>, date: formatDate(refund.createdAt, "d MMM yyyy, h:mm aaa") }}>
          {"{amount} sent back on {date}."}
        </T>
      </p>
      <p className="text-body text-ink-2">{refund.reason}</p>
    </section>
  );
};

export default RefundDetailsCard;
