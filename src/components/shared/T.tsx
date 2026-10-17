"use client";

import { fillNodes } from "@/lib/i18n/fill";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface TProps {
  children: string;
  // The parts of the sentence that change, filled into its {placeholders}
  // after translating: <T values={{ count: 3 }}>{"{count} tries"}</T>.
  values?: Record<string, React.ReactNode>;
}

// Text in the reader's language: <T>Back up now</T>. The English is the
// dictionary key, like every other string; text without Bangla stays
// English. Usable from Server Components too.
const T = ({ children, values }: TProps) => {
  const { translate } = useLocale();
  const text = translate(children);
  return values ? fillNodes(text, values) : text;
};

export default T;
