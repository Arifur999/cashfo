import { BUDGET_TONE_BAR, budgetTone } from "@/lib/budgetTone";
import { cn } from "@/lib/utils";
import { TONE_BG, type Tone } from "./tones";

interface ProgressBarProps {
  // 0–100; anything past 100 fills the bar.
  value: number;
  // A fixed colour, or "budget" for the design's under-70 / 70–90 / over-90
  // rule.
  tone?: Tone | "budget";
  size?: "sm" | "md";
  // What the bar measures, for screen readers.
  label: string;
  className?: string;
}

const ProgressBar = ({ value, tone = "money", size = "md", label, className }: ProgressBarProps) => {
  const clamped = Math.max(0, Math.min(100, value));
  const fill = tone === "budget" ? BUDGET_TONE_BAR[budgetTone(value)] : TONE_BG[tone];
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("block w-full overflow-hidden rounded-full bg-surface-sunken", size === "sm" ? "h-1.5" : "h-2", className)}
    >
      <span className={cn("block h-full rounded-full transition-[width]", fill)} style={{ width: `${clamped}%` }} />
    </span>
  );
};

export default ProgressBar;
