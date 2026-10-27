import { cn } from "@/lib/utils";

const TONES = {
  // design-v4's amber hint: the pale fill and the deep brown words.
  warning: "bg-warning-50 text-warning-ink",
  info: "bg-info-soft text-info",
  mint: "bg-mint-50 text-brand-ink",
  danger: "bg-expense-soft text-expense",
  // A quiet note (how long a link lasts).
  neutral: "bg-strip text-ink-2",
} as const;

interface BannerProps extends React.ComponentProps<"div"> {
  tone?: keyof typeof TONES;
  icon?: React.ReactNode;
  // A strip across the top of a page, or a rounded note inside a form.
  inline?: boolean;
}

// A short notice: offline, a rename, a limit nearly reached. It is a status
// region, announced when it appears or changes; a role passed in replaces
// that one: role="note" for a note that was there from the start, "alert"
// for an error.
const Banner = ({ tone = "warning", icon, inline = false, className, children, ...props }: BannerProps) => (
  <div
    role="status"
    className={cn(
      "flex gap-3 px-4 py-3 text-small",
      inline ? "items-start rounded-field leading-normal" : "items-center font-semibold",
      TONES[tone],
      inline && tone === "warning" && "border border-warning-line",
      className,
    )}
    {...props}
  >
    {icon && <span aria-hidden="true" className={cn("flex shrink-0 [&_svg]:size-4", inline && "mt-px [&_svg]:size-4.5")}>{icon}</span>}
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

export default Banner;
