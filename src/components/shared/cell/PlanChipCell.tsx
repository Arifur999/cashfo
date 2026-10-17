import { cn } from "@/lib/utils";

// A plan's chip, as the design colours them: the paid plans in mint and
// forest, Business in amber, anything else (Free) in the sunken grey.
const PLAN_TONE: Record<string, string> = {
  "Monthly Pro": "bg-mint-50 text-emerald",
  "Yearly Pro": "bg-forest text-white dark:bg-emerald dark:text-on-action",
  Business: "bg-warning-soft text-warning",
};

const PlanChipCell = ({ plan }: { plan: string | null | undefined }) =>
  plan ? (
    <span className={cn("inline-flex rounded-full px-2 py-px text-caption font-semibold whitespace-nowrap", PLAN_TONE[plan] ?? "bg-surface-sunken text-ink-2")}>{plan}</span>
  ) : (
    <span className="text-ink-muted">—</span>
  );

export default PlanChipCell;
