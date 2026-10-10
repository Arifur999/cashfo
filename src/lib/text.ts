// "Rafiqul Islam" -> "RI"; at most two letters, for avatar fallbacks.
export const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

// Cuts long free text for table cells; the full value belongs in a tooltip
// or detail view.
export const truncate = (value: string | null | undefined, maxLength: number, fallback = "—"): string => {
  if (!value) {
    return fallback;
  }
  return value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}…` : value;
};
