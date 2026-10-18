// The Bangla board's short day and month names, fixed here rather than taken
// from the browser's ICU data, whose Bangla abbreviations differ between
// versions ("সেপ" or "সেপ্টে").
const BN_WEEKDAYS_SHORT = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"];
const BN_MONTHS_SHORT = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];

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
