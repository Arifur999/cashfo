import type { DeviceBreakdownEntry, DeviceType } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { EmptyChartState } from "./EmptyChartState";

const COLORS: Record<DeviceType, string> = {
  MOBILE: "var(--color-brand-primary)",
  DESKTOP: "#3b82f6",
  TABLET: "#f59e0b",
};

const LABELS: Record<DeviceType, string> = {
  MOBILE: t("Mobile"),
  DESKTOP: t("Desktop"),
  TABLET: t("Tablet"),
};

export function DeviceBreakdownChart({ data }: { data: DeviceBreakdownEntry[] }) {
  if (data.length === 0) {
    return <EmptyChartState />;
  }

  let cumulative = 0;
  const stops = data
    .map((d) => {
      const start = cumulative;
      cumulative += d.percentage;
      return `${COLORS[d.deviceType]} ${start}% ${cumulative}%`;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }}>
        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.deviceType} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[d.deviceType] }} />
            <span className="text-neutral-600">{LABELS[d.deviceType]}</span>
            <span className="ml-auto pl-4 font-medium text-neutral-900">{d.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
