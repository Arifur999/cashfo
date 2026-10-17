import type { IFeatureFlag } from "@/types/featureFlag.types";
import { inEnglish, type Translate } from "./i18n/message";

// "Everyone", "25% of people", "Nobody", or "10% once it's on": how many
// people a flag reaches, with the share it is set to while it is off.
export const rolloutLabel = (flag: Pick<IFeatureFlag, "isEnabled" | "rolloutPercent">, t: Translate = inEnglish): string => {
  const percent = flag.rolloutPercent;
  if (!flag.isEnabled) return percent > 0 ? t("{percent}% once it's on", { percent }) : t("Nobody");
  if (percent >= 100) return t("Everyone");
  return percent > 0 ? t("{percent}% of people", { percent }) : t("Nobody");
};
