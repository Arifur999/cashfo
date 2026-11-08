// A day typed as DD/MM/YYYY (the transaction popup's date box, design:
// TxnDrawer), kept pure so it is tested apart from the form. Bangla digits
// are read as their Latin twins; "/", "." and "-" all separate.

const BANGLA_ZERO = 0x09e6;

// Bangla digits to Latin ones; anything else stays.
export const latinDigits = (text: string): string => text.replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - BANGLA_ZERO));

// What the box keeps of a keystroke: digits and separators, and eight
// digits in a row ("28102026") written out as "28/10/2026".
export function cleanDayText(raw: string): string {
  const text = latinDigits(raw).replace(/[^0-9/.\-]/g, "").slice(0, 10);
  return /^\d{8}$/.test(text) ? `${text.slice(0, 2)}/${text.slice(2, 4)}/${text.slice(4)}` : text;
}

// "2026-10-28" as the box shows it: "28/10/2026"; "" for no day.
export function dayText(iso: string): string {
  const parts = iso.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : "";
}

const SHAPE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

// The day the box holds, as "YYYY-MM-DD"; "" when it isn't one (empty,
// the wrong shape, or a day the calendar doesn't have: 31/02/2026).
export function parseDayText(text: string): string {
  const match = latinDigits(text).trim().match(SHAPE);
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Why the box holds no day: nothing typed, not DD/MM/YYYY, or a day the
// calendar doesn't have; null when it holds one.
export function dayTextProblem(text: string): "empty" | "shape" | "missing" | null {
  if (!text.trim()) return "empty";
  if (parseDayText(text)) return null;
  return SHAPE.test(latinDigits(text).trim()) ? "missing" : "shape";
}
