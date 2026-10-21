// The Bangla board's day and month names, fixed here rather than taken
// from the browser's ICU data, whose Bangla abbreviations differ between
// versions ("সেপ" or "সেপ্টে"). Sunday and January first, as Date counts
// them. The long names are the dictionary's own words for "Sunday" and
// "January" (habit-tracker.ts, shared.ts), so t("October") and a Bangla
// date read alike.
export const BN_WEEKDAYS_SHORT: readonly string[] = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"];
export const BN_WEEKDAYS_LONG: readonly string[] = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
export const BN_MONTHS_SHORT: readonly string[] = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];
export const BN_MONTHS_LONG: readonly string[] = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

// "am" and "pm" after a Bangla time, as the dictionary words them (todos.ts).
export const BN_AM = "পূর্বাহ্ণ";
export const BN_PM = "অপরাহ্ণ";

const BANGLA_ZERO = "০".charCodeAt(0);

// "30" -> "৩০".
export const toBanglaDigits = (value: string | number): string => String(value).replace(/\d/g, (digit) => String.fromCharCode(BANGLA_ZERO + Number(digit)));

// "৩০ সেপ্টে" for a "YYYY-MM-DD" day.
export function banglaDayMonth(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  return `${toBanglaDigits(date.getUTCDate())} ${BN_MONTHS_SHORT[date.getUTCMonth()]}`;
}

// "বৃহস্পতি, ১ অক্টো" for a "YYYY-MM-DD" day, as the Bangla board heads a day.
export function banglaShortDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  return `${BN_WEEKDAYS_SHORT[date.getUTCDay()]}, ${toBanglaDigits(date.getUTCDate())} ${BN_MONTHS_SHORT[date.getUTCMonth()]}`;
}

// "অক্টো" for a "YYYY-MM" month key (or a "YYYY-MM-DD" day's month), as a
// chart writes it under a bar. Anything else comes back as it was.
export const banglaMonthShort = (key: string): string => BN_MONTHS_SHORT[Number(key.split("-")[1]) - 1] ?? key;
