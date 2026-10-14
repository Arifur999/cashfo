import { cn } from "@/lib/utils";

const TONES = {
  mint: "bg-mint-50 text-brand-ink",
  income: "bg-income-soft text-income",
  expense: "bg-expense-soft text-expense",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  loans: "bg-pillar-loans-soft text-pillar-loans",
  habits: "bg-pillar-habits-soft text-pillar-habits",
  insights: "bg-pillar-insights-soft text-pillar-insights",
  neutral: "bg-surface-sunken text-ink-2",
  // The "Earn ৳" tag and the balance trend on the hero.
  glow: "bg-mint-glow text-forest",
  // On the Night sidebar and the aurora hero.
  onDark: "bg-mint-200/16 text-white",
  // Over a dark toast.
  forest: "bg-forest text-white",
} as const;

interface ChipProps extends React.ComponentProps<"span"> {
  tone?: keyof typeof TONES;
  size?: "sm" | "md";
}

// A small pill: a status, a count, a trend, a plan name.
const Chip = ({ tone = "mint", size = "md", className, ...props }: ChipProps) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center gap-1 rounded-full px-3 text-caption font-bold whitespace-nowrap tabular-nums",
      size === "sm" ? "h-[22px] px-2" : "h-6",
      TONES[tone],
      className,
    )}
    {...props}
  />
);

export default Chip;
