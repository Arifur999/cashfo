import { formatMonthKey } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import type { ICohortRow } from "@/types/analytics.types";

// Heatmap shades on the brand colour: the darker, the more of the cohort
// is still active that month.
const cellClassName = (percent: number | null) => {
  if (percent === null) return "bg-muted/40 text-muted-foreground/50";
  if (percent === 0) return "bg-muted text-muted-foreground";
  if (percent < 20) return "bg-primary/15 text-foreground";
  if (percent < 40) return "bg-primary/30 text-foreground";
  if (percent < 60) return "bg-primary/50 text-foreground";
  if (percent < 80) return "bg-primary/75 text-primary-foreground";
  return "bg-primary text-primary-foreground";
};

const CohortRetentionGrid = ({ rows }: { rows: ICohortRow[] }) => {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No signups yet.</p>;
  }

  const monthCount = rows[0].monthsSinceSignup.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">Share of each signup month still active in the months after signing up</caption>
        <thead>
          <tr className="text-xs text-muted-foreground uppercase">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              Cohort
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Users
            </th>
            {Array.from({ length: monthCount }, (_, month) => (
              <th key={month} scope="col" className="px-1 py-2 text-center font-medium">
                {month === 0 ? "Signup" : `+${month}m`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohortMonth}>
              <th scope="row" className="px-3 py-1.5 text-left font-medium whitespace-nowrap text-foreground">
                {formatMonthKey(row.cohortMonth)}
              </th>
              <td className="px-3 py-1.5 text-right text-muted-foreground tabular-nums">{formatNumber(row.cohortSize)}</td>
              {row.monthsSinceSignup.map((percent, month) => (
                <td key={month} className="px-1 py-1">
                  <div className={cn("rounded-md px-2 py-1.5 text-center text-xs font-medium tabular-nums", cellClassName(percent))}>
                    {percent === null ? "—" : `${percent}%`}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CohortRetentionGrid;
