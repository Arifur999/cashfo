import type { IFeatureFlag } from "@/types/featureFlag.types";

// "Everyone", "25% of people", "Nobody", or "10% once it's on": how many
// people a flag reaches, with the share it is set to while it is off.
export const rolloutLabel = (flag: Pick<IFeatureFlag, "isEnabled" | "rolloutPercent">): string => {
  const percent = flag.rolloutPercent;
  if (!flag.isEnabled) return percent > 0 ? `${percent}% once it's on` : "Nobody";
  if (percent >= 100) return "Everyone";
  return percent > 0 ? `${percent}% of people` : "Nobody";
};
