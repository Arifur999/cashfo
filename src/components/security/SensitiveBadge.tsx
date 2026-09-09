import { t } from "@/lib/i18n/t";

export function isSensitiveEntry(newValue: unknown): boolean {
  return Boolean(newValue && typeof newValue === "object" && (newValue as { sensitive?: unknown }).sensitive === true);
}

export function SensitiveBadge() {
  return (
    <span
      title={t("Sensitive action")}
      className="inline-flex h-2 w-2 shrink-0 rounded-full bg-brand-danger"
      aria-label={t("Sensitive action")}
    />
  );
}
