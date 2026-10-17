import Card from "@/components/smartly/Card";
import MiniBars from "@/components/shared/MiniBars";
import { formatMonthKey } from "@/lib/date";
import type { IMrrHistoryPoint } from "@/types/revenue.types";

// "৳ 60.4k": a bar's label.
const short = (value: number) => (value >= 1000 ? `৳ ${(value / 1000).toFixed(1)}k` : `৳ ${Math.round(value)}`);

// MRR at the end of each of the last six months, the running month in forest.
const MrrHistoryCard = ({ history }: { history: IMrrHistoryPoint[] }) => {
  const first = history[0]?.mrr ?? 0;
  const last = history[history.length - 1]?.mrr ?? 0;
  const growth = first > 0 ? Math.round(((last - first) / first) * 100) : null;
  const nothing = history.every((point) => point.mrr === 0);

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-title text-ink">MRR at the end of each month</h2>
        {growth !== null && history.length > 1 && (
          <span className="text-small text-ink-muted">
            {growth >= 0 ? "up" : "down"} {Math.abs(growth)}% since {formatMonthKey(history[0].month, false)}
          </span>
        )}
      </div>
      {nothing ? (
        <p className="py-8 text-center text-small text-ink-muted">No paid months yet.</p>
      ) : (
        <MiniBars
          label="MRR at the end of each month"
          height={180}
          gap="6"
          bars={history.map((point, index) => ({ label: formatMonthKey(point.month, false), value: point.mrr, short: short(point.mrr), highlight: index === history.length - 1 }))}
        />
      )}
    </Card>
  );
};

export default MrrHistoryCard;
