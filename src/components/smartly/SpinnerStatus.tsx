import { cn } from "@/lib/utils";

interface SpinnerStatusProps {
  // What is taking a while ("Making your report… this can take a few seconds").
  children: React.ReactNode;
  size?: number;
  className?: string;
}

// The spinner with words, for slow work only (reports, exports). Lists use
// SkeletonRows.
const SpinnerStatus = ({ children, size = 40, className }: SpinnerStatusProps) => (
  <div className={cn("flex flex-col items-center justify-center gap-4 p-6 text-center", className)}>
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="animate-spin">
      <circle cx="20" cy="20" r="16" fill="none" stroke="var(--surface-sunken)" strokeWidth="4" />
      <circle cx="20" cy="20" r="16" fill="none" stroke="var(--emerald)" strokeWidth="4" strokeLinecap="round" strokeDasharray="30 100" transform="rotate(-90 20 20)" />
    </svg>
    <p role="status" className="text-body text-ink-muted">
      {children}
    </p>
  </div>
);

export default SpinnerStatus;
