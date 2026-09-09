import { Banknote, CreditCard, Smartphone } from "lucide-react";
import type { PaymentGateway } from "@/lib/api";

const ICONS: Record<PaymentGateway, React.ComponentType<{ className?: string }>> = {
  BKASH: Smartphone,
  NAGAD: Smartphone,
  SSLCOMMERZ: CreditCard,
  CARD: CreditCard,
  MANUAL: Banknote,
};

const LABELS: Record<PaymentGateway, string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
  SSLCOMMERZ: "SSLCommerz",
  CARD: "Card",
  MANUAL: "Manual",
};

export function GatewayBadge({ gateway }: { gateway: PaymentGateway }) {
  const Icon = ICONS[gateway];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-neutral-600">
      <Icon className="h-3.5 w-3.5 text-neutral-400" />
      {LABELS[gateway]}
    </span>
  );
}
