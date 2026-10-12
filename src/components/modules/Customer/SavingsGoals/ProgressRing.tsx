interface ProgressRingProps {
  percent: number;
  label: string;
}

// Donut ring via conic-gradient -- the percent is dynamic per-request data,
// so this has to be an inline style (Tailwind's static scanner can't pick
// up a template-literal percent class, same reasoning documented on
// AddTransactionModal's amount input color).
export function ProgressRing({ percent, label }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="relative flex h-32 w-32 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(var(--color-brand-primary) ${clamped * 3.6}deg, var(--color-neutral-100) 0deg)` }}
    >
      <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-surface">
        <span className="text-2xl font-bold text-neutral-900">{clamped}%</span>
        <span className="text-xs text-neutral-400">{label}</span>
      </div>
    </div>
  );
}
