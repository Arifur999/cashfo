import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-9.5 text-small",
  md: "h-11 text-body",
  lg: "h-12 text-body",
} as const;

interface NativeSelectProps extends Omit<React.ComponentProps<"select">, "size"> {
  size?: keyof typeof SIZES;
  invalid?: boolean;
  frameClassName?: string;
}

// The browser's own select in the design's frame: the line-strong border,
// 12px radius, the chevron on the right, the emerald focus ring.
const NativeSelect = ({ size = "md", invalid = false, frameClassName, className, ...props }: NativeSelectProps) => (
  <span className={cn("relative inline-flex min-w-0", frameClassName)}>
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full appearance-none rounded-md border bg-surface pr-9 pl-3 font-medium text-ink outline-none transition-[border-color,box-shadow]",
        "focus:border-emerald focus:shadow-[0_0_0_0.5px_var(--emerald),0_0_0_4px_var(--mint-50)] disabled:opacity-60",
        invalid ? "border-expense" : "border-line-strong",
        SIZES[size],
        className,
      )}
      {...props}
    />
    <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
  </span>
);

export default NativeSelect;
