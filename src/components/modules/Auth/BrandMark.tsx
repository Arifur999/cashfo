import { Wallet } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  // White lettering, for the dark brand panel.
  inverted?: boolean;
  className?: string;
}

// The logo: the wallet mark beside the product name.
const BrandMark = ({ inverted = false, className }: BrandMarkProps) => (
  <span className={cn("flex items-center gap-2.5", inverted ? "text-white" : "text-foreground", className)}>
    <span className="flex size-9 items-center justify-center rounded-xl bg-brand-primary text-white shadow-md shadow-brand-primary/30">
      <Wallet className="size-5" aria-hidden="true" />
    </span>
    <span className="text-lg font-semibold tracking-tight">{BRAND_NAME}</span>
  </span>
);

export default BrandMark;
