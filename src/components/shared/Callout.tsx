import { AlertCircle, AlertTriangle, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// The design's notes: a pale fill, a faint line of the same hue, its ink.
const VARIANTS: Record<"info" | "warning" | "danger", { icon: LucideIcon; className: string }> = {
  info: { icon: Info, className: "border-info/20 bg-info-soft text-info" },
  warning: { icon: AlertTriangle, className: "border-warning/25 bg-warning-soft text-warning" },
  danger: { icon: AlertCircle, className: "border-expense/20 bg-expense-soft text-expense" },
};

interface CalloutProps {
  variant?: keyof typeof VARIANTS;
  // "alert" for messages that appear in response to an action (errors).
  role?: "alert" | "status";
  className?: string;
  children: React.ReactNode;
}

const Callout = ({ variant = "info", role, className, children }: CalloutProps) => {
  const { icon: Icon, className: variantClassName } = VARIANTS[variant];

  return (
    <div role={role} className={cn("flex items-start gap-3 rounded-md border px-4 py-3 text-small leading-relaxed", variantClassName, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
};

export default Callout;
