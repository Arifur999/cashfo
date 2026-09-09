import { t } from "@/lib/i18n/t";

export function EmptyChartState({ message }: { message?: string }) {
  return <p className="py-10 text-center text-sm text-neutral-400">{message ?? t("No data for this period.")}</p>;
}
