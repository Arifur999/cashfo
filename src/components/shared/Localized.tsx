"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { Translate } from "@/lib/i18n/message";

// For table cells and other render callbacks that can't call a hook: the
// reader's translate, handed to a function --
// <Localized>{(t) => trialLine(plan, t)}</Localized>.
const Localized = ({ children }: { children: (t: Translate) => ReactNode }) => {
  const { translate } = useLocale();
  return children(translate);
};

export default Localized;
