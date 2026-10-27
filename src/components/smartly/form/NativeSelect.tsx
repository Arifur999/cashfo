import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// md and lg match InputFrame's: 16px text below md, so iOS doesn't zoom in.
const SIZES = {
  sm: "h-9.5 text-small",
  md: "h-11 text-body max-md:text-body-lg",
  lg: "h-12 text-body max-md:text-body-lg",
} as const;

interface NativeSelectProps extends Omit<React.ComponentProps<"select">, "size"> {
  size?: keyof typeof SIZES;
  invalid?: boolean;
  frameClassName?: string;
}

// The browser's own select in the design's frame: the field edge, 10px
// corners, the chevron on the right, the focus edge and halo.
const NativeSelect = ({ size = "md", invalid = false, frameClassName, className, ...props }: NativeSelectProps) => (
  <span className={cn("relative inline-flex min-w-0", frameClassName)}>
    <select
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full appearance-none rounded-field border bg-surface pr-9 pl-3 font-medium text-ink outline-none transition-[border-color,box-shadow] disabled:opacity-60",
        invalid ? "border-expense focus:error-halo" : "border-input focus:border-focus-ring focus:focus-halo",
        SIZES[size],
        className,
      )}
      {...props}
    />
    <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
  </span>
);

export default NativeSelect;
