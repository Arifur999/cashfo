import { cn } from "@/lib/utils";

const SIZES = {
  // Outer ring → inner disc, as the design draws each one.
  34: { outer: "size-8.5", inner: "size-6" },
  52: { outer: "size-13", inner: "size-10" },
  92: { outer: "size-23", inner: "size-18" },
  96: { outer: "size-24", inner: "size-18.5" },
  112: { outer: "size-28", inner: "size-21.5" },
  128: { outer: "size-32", inner: "size-25" },
} as const;

interface GoalRingProps {
  // 0–100.
  percent: number;
  // A CSS colour (a token var), as goalColor() gives it.
  color: string;
  size?: keyof typeof SIZES;
  // What the ring measures, for screen readers.
  label: string;
  // The figure and caption in the middle.
  children?: React.ReactNode;
  className?: string;
}

// How full a goal is: a conic ring in the goal's colour around a white disc.
// The percentage is per-request data, so the gradient is an inline style.
export function GoalRing({ percent, color, size = 92, label, children, className }: GoalRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <span role="img" aria-label={label} className={cn("flex shrink-0 items-center justify-center rounded-full", SIZES[size].outer, className)} style={{ background: `conic-gradient(${color} 0 ${clamped}%, var(--line) ${clamped}% 100%)` }}>
      <span className={cn("flex flex-col items-center justify-center rounded-full bg-surface text-ink", SIZES[size].inner)}>{children}</span>
    </span>
  );
}
