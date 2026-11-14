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
  rose: "bg-rose-soft text-rose",
  neutral: "bg-surface-sunken text-ink-2",
  // Ledger: money put into an investment, and capital back from one.
  teal: "bg-tint-teal text-note-ink",
  green: "bg-tint-green text-tint-green-ink",
  // The "Earn ৳" tag and the balance trend on the hero.
  glow: "bg-mint-glow text-forest",
  // On the Night sidebar and the aurora hero.
  onDark: "bg-mint-200/16 text-white",
  // Over a dark toast.
  forest: "bg-forest text-white",
} as const;

export type ChipTone = keyof typeof TONES;

interface ChipProps extends React.ComponentProps<"span"> {
  tone?: ChipTone;
  size?: "sm" | "md";
}

// A small pill: a status, a count, a trend, a plan name. design-v4 draws it
// 12px semibold, 2px 8px round it (sm: 11px, for a tag beside a name).
const Chip = ({ tone = "mint", size = "md", className, ...props }: ChipProps) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center gap-1.25 rounded-full text-caption font-semibold whitespace-nowrap tabular-nums",
      size === "sm" ? "h-4.5 px-1.75 text-[11px]" : "h-5 px-2",
      TONES[tone],
      className,
    )}
    {...props}
  />
);

export default Chip;
