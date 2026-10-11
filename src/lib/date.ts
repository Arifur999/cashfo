import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

// Every date in the panel renders in the platform's own timezone, not the
// machine's. A Server Component on a UTC host and the hydrating browser in
// Dhaka must print the same text, or React reports a hydration mismatch --
// and admins expect "today" to mean Bangladesh's today regardless.
export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIME_ZONE ?? "Asia/Dhaka";

export const DATE_FORMAT = "MMM dd, yyyy";
export const DATE_TIME_FORMAT = "MMM dd, yyyy, hh:mm a";

type DateInput = string | number | Date | null | undefined;

export const formatDate = (value: DateInput, pattern = DATE_FORMAT, fallback = "—"): string => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return format(new TZDate(date, APP_TIME_ZONE), pattern);
};

export const formatDateTime = (value: DateInput, fallback = "—") => formatDate(value, DATE_TIME_FORMAT, fallback);

// yyyy-MM-dd in the platform timezone, for <input type="date"> values and
// date-range query params.
export const toDateInputValue = (value: DateInput) => formatDate(value, "yyyy-MM-dd", "");

const parseDay = (day: string) => {
  const [year, month, date] = day.split("-").map(Number);
  return { year, monthIndex: month - 1, date };
};

// "2026-10-31" -> the first / last instant of that calendar day in the
// platform timezone, as ISO strings. A coupon "valid until Oct 31" must still
// work on Oct 31 in Dhaka -- midnight UTC would end it six hours early.
export const startOfDayIso = (day: string): string => {
  const { year, monthIndex, date } = parseDay(day);
  // TZDate#toISOString keeps the zone offset; go through Date for UTC "Z".
  return new Date(new TZDate(year, monthIndex, date, 0, 0, 0, 0, APP_TIME_ZONE).getTime()).toISOString();
};

export const endOfDayIso = (day: string): string => {
  const { year, monthIndex, date } = parseDay(day);
  return new Date(new TZDate(year, monthIndex, date, 23, 59, 59, 999, APP_TIME_ZONE).getTime()).toISOString();
};

// <input type="datetime-local"> values ("2026-10-11T09:30") are read and
// written in the platform timezone, like every date the panel shows -- so a
// 09:30 announcement starts at 09:30 in Dhaka whatever the admin's machine says.
export const DATE_TIME_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const toDateTimeInputValue = (value: DateInput) => formatDate(value, "yyyy-MM-dd'T'HH:mm", "");

export const dateTimeInputToIso = (value: string): string => {
  const [day, time] = value.split("T");
  const { year, monthIndex, date } = parseDay(day);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(new TZDate(year, monthIndex, date, hours, minutes, 0, 0, APP_TIME_ZONE).getTime()).toISOString();
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-10" -> "Oct 2026" (or "Oct" with withYear = false). Month keys are
// already calendar months, so no timezone conversion applies.
export const formatMonthKey = (key: string, withYear = true): string => {
  const [year, month] = key.split("-");
  const label = MONTH_LABELS[Number(month) - 1];
  if (!label) {
    return key;
  }
  return withYear ? `${label} ${year}` : label;
};
