// Small predicates shared by zod schemas (and unit-tested), so the same rule
// isn't re-implemented per form.

// An IANA zone the runtime actually knows ("Asia/Dhaka"), not just any string.
export const isValidTimeZone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

// Up to two decimal places, no sign, no exponent: "1500", "99.5", "0.25".
export const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

// Whole numbers only, optionally negative (feature limits use -1 = unlimited).
export const INTEGER_PATTERN = /^-?\d+$/;
