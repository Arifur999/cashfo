import type { RevenueTrendPoint } from "@/lib/api";
import { t } from "@/lib/i18n/t";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatMonth(key: string): string {
  const [, month] = key.split("-");
  return MONTH_LABELS[Number(month) - 1] ?? key;
}

interface RevenueTrendChartProps {
  trend: RevenueTrendPoint[];
}

const WIDTH = 100;
const HEIGHT = 32;

export function RevenueTrendChart({ trend }: RevenueTrendChartProps) {
  const max = Math.max(...trend.map((p) => p.amount), 1);
  const stepX = WIDTH / Math.max(trend.length - 1, 1);

  const points = trend.map((p, i) => {
    const x = i * stepX;
    const y = HEIGHT - (p.amount / max) * HEIGHT;
    return { x, y, amount: p.amount };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
      <h2 className="mb-4 text-sm font-semibold text-neutral-900">{t("Revenue Trend (Last 12 Months)")}</h2>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-40 w-full overflow-visible">
        <path d={areaPath} fill="var(--color-brand-primary)" fillOpacity={0.12} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--color-brand-primary)" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={0.8} fill="var(--color-brand-primary)" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-neutral-400">
        {trend.map((p, i) => (
          <span key={i} className={i % 2 === 1 ? "hidden sm:inline" : ""}>
            {formatMonth(p.month)}
          </span>
        ))}
      </div>
    </div>
  );
}
