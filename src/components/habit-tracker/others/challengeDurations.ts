// Duration options in human terms (a challenge is a day-count goal
// underneath, same as Ramadan's 29/30, but "3 Months" reads better than "90"
// for an open-ended goal with no fixed calendar length). Shared between the
// create modal (the dropdown) and the list/sheet pages (the label a
// tracker's totalDays is shown with, when it matches a preset exactly).
export const CHALLENGE_DURATIONS = [
  { days: 7, label: "1 Week" },
  { days: 14, label: "2 Weeks" },
  { days: 30, label: "1 Month" },
  { days: 60, label: "2 Months" },
  { days: 90, label: "3 Months" },
  { days: 180, label: "6 Months" },
  { days: 365, label: "1 Year" },
] as const;

// The i18n key for totalDays, or null for a custom count that doesn't match
// any preset exactly (the caller falls back to "N days").
export function challengeDurationLabel(totalDays: number): string | null {
  return CHALLENGE_DURATIONS.find((d) => d.days === totalDays)?.label ?? null;
}
