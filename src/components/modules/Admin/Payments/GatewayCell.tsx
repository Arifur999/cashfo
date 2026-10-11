import { Banknote, CreditCard, Smartphone, type LucideIcon } from "lucide-react";
import { humanizeEnum } from "@/lib/statusBadge";
import type { PaymentGateway } from "@/types/payment.types";

const ICONS: Record<PaymentGateway, LucideIcon> = {
  BKASH: Smartphone,
  NAGAD: Smartphone,
  SSLCOMMERZ: CreditCard,
  CARD: CreditCard,
  MANUAL: Banknote,
};

const GatewayCell = ({ gateway }: { gateway: PaymentGateway }) => {
  const Icon = ICONS[gateway];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="size-3.5" aria-hidden="true" />
      {humanizeEnum(gateway)}
    </span>
  );
};

export default GatewayCell;
