import type { IFeatureFlag } from "@/types/featureFlag.types";
import { formatCount } from "./i18n/digits";
import { inEnglish, type Translate } from "./i18n/message";
import type { Locale } from "./i18n/translate";

// "Everyone", "25% of people", "Nobody", or "10% once it's on": how many
// people a flag reaches, with the share it is set to while it is off. The
// share comes in the reader's digits when `locale` is given ("২৫%").
export const rolloutLabel = (flag: Pick<IFeatureFlag, "isEnabled" | "rolloutPercent">, t: Translate = inEnglish, locale: Locale = "en"): string => {
  const percent = flag.rolloutPercent;
  if (!flag.isEnabled) return percent > 0 ? t("{percent}% once it's on", { percent: formatCount(percent, locale) }) : t("Nobody");
  if (percent >= 100) return t("Everyone");
  return percent > 0 ? t("{percent}% of people", { percent: formatCount(percent, locale) }) : t("Nobody");
};
