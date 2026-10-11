import { formatNumber } from "./number";

// "Rafiqul Islam" -> "RI"; at most two letters, for avatar fallbacks.
export const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

// pluralize(1, "message") -> "1 message"; pluralize(3, "reply", "replies") -> "3 replies"
export const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${formatNumber(count)} ${count === 1 ? singular : plural}`;

// Cuts long free text for table cells; the full value belongs in a tooltip
// or detail view.
export const truncate = (value: string | null | undefined, maxLength: number, fallback = "—"): string => {
  if (!value) {
    return fallback;
  }
  return value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}…` : value;
};
