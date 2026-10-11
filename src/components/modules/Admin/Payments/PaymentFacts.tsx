import StatsGrid from "@/components/shared/StatsGrid";
import { formatCurrency } from "@/lib/currency";
import { formatDateTime } from "@/lib/date";
import { humanizeEnum } from "@/lib/statusBadge";
import type { IPaymentDetail } from "@/types/payment.types";

const PaymentFacts = ({ payment }: { payment: IPaymentDetail }) => {
  return (
    <StatsGrid
      columns={3}
      items={[
        {
          title: "Plan",
          value: payment.plan.name,
          iconName: "Tag",
          description: payment.discountApplied ? `Discount applied: ${formatCurrency(payment.discountApplied, payment.currency)}` : undefined,
        },
        {
          title: "Gateway",
          value: humanizeEnum(payment.gateway),
          iconName: "CreditCard",
          description: payment.gatewayReferenceId ? `Ref: ${payment.gatewayReferenceId}` : undefined,
        },
        { title: "Paid At", value: formatDateTime(payment.paidAt), iconName: "Clock" },
      ]}
    />
  );
};

export default PaymentFacts;
