import { Check, X } from "lucide-react";
import type { IFeatureLimits } from "@/types/plan.types";
import { formatLimit, PLAN_FEATURE_TOGGLES, PLAN_NUMERIC_LIMITS } from "./planFeatures";

const PlanFeatureList = ({ limits }: { limits: IFeatureLimits }) => {
  return (
    <ul className="space-y-1.5 text-sm text-muted-foreground">
      {PLAN_NUMERIC_LIMITS.map(({ key, label }) => (
        <li key={key} className="flex justify-between gap-2">
          <span>{label}</span>
          <span className="font-medium text-foreground tabular-nums">{formatLimit(limits[key])}</span>
        </li>
      ))}
      {PLAN_FEATURE_TOGGLES.map(({ key, label }) => (
        <li key={key} className="flex items-center gap-1.5">
          {limits[key] ? (
            <Check className="size-3.5 text-primary" aria-label="Included" />
          ) : (
            <X className="size-3.5 text-muted-foreground/50" aria-label="Not included" />
          )}
          {label}
        </li>
      ))}
    </ul>
  );
};

export default PlanFeatureList;
