import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import DescriptionList from "@/components/shared/DescriptionList";
import SectionCard from "@/components/shared/SectionCard";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import type { IRefund } from "@/types/payment.types";

const RefundDetailsCard = ({ refund, currency }: { refund: IRefund; currency: string }) => {
  return (
    <SectionCard title="Refund" action={<StatusBadgeCell status={refund.status} />}>
      <DescriptionList
        layout="stacked"
        items={[
          { label: "Amount", value: <span className="font-medium tabular-nums">{formatCurrency(refund.amount, currency)}</span> },
          { label: "Date", value: formatDateTime(refund.createdAt) },
          { label: "Reason", value: refund.reason, fullWidth: true },
        ]}
      />
    </SectionCard>
  );
};

export default RefundDetailsCard;
