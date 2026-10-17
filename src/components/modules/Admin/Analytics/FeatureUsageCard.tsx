import Card from "@/components/smartly/Card";
import { formatNumber } from "@/lib/number";
import type { IFeatureUsageEntry } from "@/types/analytics.types";
import { featureLabel } from "./analyticsLabels";

// What people did in the chosen period, the most common first, each as a
// bar against the most common one.
const FeatureUsageCard = ({ data, rangeLabel }: { data: IFeatureUsageEntry[]; rangeLabel: string }) => {
  const rows = [...data].sort((a, b) => b.count - a.count);
  const most = Math.max(1, ...rows.map((row) => row.count));

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-title text-ink">What people do</h2>
        <span className="text-small text-ink-muted">{rangeLabel}</span>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-small text-ink-muted">Nothing recorded in these days.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.eventType} className="grid grid-cols-[150px_minmax(0,1fr)_70px] items-center gap-3 text-body">
              <span className="truncate text-ink">{featureLabel(row.eventType)}</span>
              <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full bg-emerald" style={{ width: `${Math.max(1.5, (row.count / most) * 100)}%` }} />
              </span>
              <b className="text-right font-semibold text-ink tabular-nums">{formatNumber(row.count)}</b>
            </li>
          ))}
        </ul>
      )}
      <span className="text-small text-ink-muted">Opening reports, habits and the password manager aren&apos;t counted yet.</span>
    </Card>
  );
};

export default FeatureUsageCard;
