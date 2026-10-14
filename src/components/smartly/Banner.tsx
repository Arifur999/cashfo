import { cn } from "@/lib/utils";

const TONES = {
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  mint: "bg-mint-50 text-brand-ink",
  danger: "bg-expense-soft text-expense",
} as const;

interface BannerProps extends React.ComponentProps<"div"> {
  tone?: keyof typeof TONES;
  icon?: React.ReactNode;
  // A strip across the top of a page, or a rounded note inside a form.
  inline?: boolean;
}

// A short notice: offline, a rename, a limit nearly reached.
const Banner = ({ tone = "warning", icon, inline = false, className, children, ...props }: BannerProps) => (
  <div
    role="status"
    className={cn(
      "flex gap-3 px-4 py-3 text-small",
      inline ? "items-start rounded-md" : "items-center font-semibold",
      TONES[tone],
      className,
    )}
    {...props}
  >
    {icon && <span aria-hidden="true" className={cn("flex shrink-0 [&_svg]:size-4", inline && "mt-px [&_svg]:size-4.5")}>{icon}</span>}
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

export default Banner;
