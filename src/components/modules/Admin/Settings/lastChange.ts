import { formatDate } from "@/lib/date";
import type { Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";

export interface LastChange {
  at: string;
  by: string | null;
}

// "Last changed by Nadia Rahman on 14 September 2026" -- with "at 11:20 am"
// when the card asks for the time -- or "Not changed yet." The Settings
// cards' footers start with it.
export function lastChangeText(change: LastChange | null | undefined, t: Translate, locale: Locale, withTime = false): string {
  if (!change) return t("Not changed yet.");
  const values = { name: change.by ?? "", day: formatDate(change.at, "d MMMM yyyy", "—", locale), time: formatDate(change.at, "h:mm aaa", "—", locale) };
  if (withTime) return t(change.by ? "Last changed by {name} on {day} at {time}." : "Last changed on {day} at {time}.", values);
  return t(change.by ? "Last changed by {name} on {day}." : "Last changed on {day}.", values);
}
