import { AlertCircle, AlertTriangle, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS: Record<"info" | "warning" | "danger", { icon: LucideIcon; className: string }> = {
  info: { icon: Info, className: "bg-muted text-muted-foreground" },
  warning: { icon: AlertTriangle, className: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" },
  danger: { icon: AlertCircle, className: "bg-destructive/10 text-destructive" },
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
    <div role={role} className={cn("flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm", variantClassName, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
};

export default Callout;
