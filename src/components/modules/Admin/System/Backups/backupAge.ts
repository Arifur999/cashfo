export type BackupAgeTone = "ok" | "warning" | "danger";

// How worried "Days since a good backup" should look: fine for two days,
// amber after that, red after a week or when there has never been one.
export const backupAgeTone = (days: number | null): BackupAgeTone => {
  if (days === null || days > 7) return "danger";
  return days > 2 ? "warning" : "ok";
};
