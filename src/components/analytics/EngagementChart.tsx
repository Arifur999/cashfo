import type { EngagementPoint } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { EmptyChartState } from "./EmptyChartState";

const WIDTH = 100;
const HEIGHT = 32;
const WAU_COLOR = "#a3a3a3";

function formatShortDate(iso: string): string {
  const [, month, day] = iso.split("-");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTHS[Number(month) - 1]} ${Number(day)}`;
}

export function EngagementChart({ data }: { data: EngagementPoint[] }) {
  if (data.length === 0) {
    return <EmptyChartState />;
  }

  const max = Math.max(...data.map((d) => Math.max(d.dau, d.wau)), 1);
  const stepX = WIDTH / Math.max(data.length - 1, 1);

  function toPath(key: "dau" | "wau") {
    return data
      .map((d, i) => {
        const x = i * stepX;
        const y = HEIGHT - (d[key] / max) * HEIGHT;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }

  const labelStride = Math.max(Math.ceil(data.length / 8), 1);

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand-primary" /> {t("DAU")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: WAU_COLOR }} /> {t("WAU")}
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-40 w-full overflow-visible">
        <path d={toPath("wau")} fill="none" stroke={WAU_COLOR} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
        <path d={toPath("dau")} fill="none" stroke="var(--color-brand-primary)" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-neutral-400">
        {data.map((d, i) => (
          <span key={d.date} className={i % labelStride !== 0 ? "hidden sm:inline" : ""}>
            {formatShortDate(d.date)}
          </span>
        ))}
      </div>
    </div>
  );
}
