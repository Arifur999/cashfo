import { DAY_NAME, officeDays, type WeekDay } from "@/lib/customer/helpPage";
import { toLocaleDigits } from "@/lib/i18n/digits";
import type { Translate } from "@/lib/i18n/message";
import type { Locale } from "@/lib/i18n/translate";

// "9:00" from "09:00", in the reader's digits.
export const clockText = (time: string, locale: Locale) => toLocaleDigits(time.replace(/^0(\d)/, "$1"), locale);

// The office days as the Settings board words them: "Every day", "Closed
// every day", "Saturday to Thursday" for days that run together, or the
// days listed ("Sunday, Tuesday").
export function officeDaysText(days: WeekDay[], t: Translate): string {
  if (days.length === 0) return t("Closed every day");
  if (days.length === 7) return t("Every day");
  const runs = officeDays(days);
  if (runs.length === 1 && runs[0].length > 1) return t("{first} to {last}", { first: t(DAY_NAME[runs[0][0]]), last: t(DAY_NAME[runs[0][runs[0].length - 1]]) });
  return runs
    .flat()
    .map((day) => t(DAY_NAME[day]))
    .join(", ");
}

// "Saturday to Thursday, 9:00 to 18:00".
export const officeHoursText = (days: WeekDay[], opensAt: string, closesAt: string, t: Translate, locale: Locale) =>
  t("{days}, {from} to {to}", { days: officeDaysText(days, t), from: clockText(opensAt, locale), to: clockText(closesAt, locale) });
