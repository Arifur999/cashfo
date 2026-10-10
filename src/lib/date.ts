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
