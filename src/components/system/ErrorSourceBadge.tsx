import { cn } from "@/lib/utils";
import type { ErrorLogSource } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const STYLES: Record<ErrorLogSource, string> = {
  BACKEND_API: "bg-blue-100 text-blue-700",
  ADMIN_FRONTEND: "bg-purple-100 text-purple-700",
  BACKGROUND_JOB: "bg-teal-100 text-teal-700",
};

const LABELS: Record<ErrorLogSource, string> = {
  BACKEND_API: t("Backend API"),
  ADMIN_FRONTEND: t("Admin Frontend"),
  BACKGROUND_JOB: t("Background Job"),
};

export function ErrorSourceBadge({ source }: { source: ErrorLogSource }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[source])}>
      {LABELS[source]}
    </span>
  );
}
