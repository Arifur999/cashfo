"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

// Text in the reader's language: <T>Back up now</T>. The English is the
// dictionary key, like every other string; text without Bangla stays
// English. Usable from Server Components too.
const T = ({ children }: { children: string }) => {
  const { translate } = useLocale();
  return translate(children);
};

export default T;
