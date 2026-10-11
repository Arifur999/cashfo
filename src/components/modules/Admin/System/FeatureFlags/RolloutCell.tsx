import { cn } from "@/lib/utils";

// Rollout share as a number and a thin bar; dimmed while the flag is off,
// since the percentage only applies to an enabled flag.
const RolloutCell = ({ percent, isEnabled }: { percent: number; isEnabled: boolean }) => {
  return (
    <div className={cn("flex w-32 items-center gap-2", !isEnabled && "opacity-50")}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-medium tabular-nums">{percent}%</span>
    </div>
  );
};

export default RolloutCell;
