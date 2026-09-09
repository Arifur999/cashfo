import type { CohortRow } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { EmptyChartState } from "./EmptyChartState";

function monthLabel(cohortMonth: string): string {
  const [year, month] = cohortMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function cellStyle(pct: number | null): string {
  if (pct === null) return "bg-neutral-50 text-neutral-300";
  if (pct === 0) return "bg-neutral-100 text-neutral-400";
  if (pct < 20) return "bg-green-100 text-green-800";
  if (pct < 40) return "bg-green-200 text-green-800";
  if (pct < 60) return "bg-green-300 text-green-900";
  if (pct < 80) return "bg-green-500 text-white";
  return "bg-green-700 text-white";
}

export function CohortRetentionGrid({ rows }: { rows: CohortRow[] }) {
  if (rows.length === 0) {
    return <EmptyChartState />;
  }

  const monthCount = rows[0].monthsSinceSignup.length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2 text-xs font-medium uppercase text-neutral-400">{t("Cohort")}</th>
            <th className="px-3 py-2 text-xs font-medium uppercase text-neutral-400">{t("Users")}</th>
            {Array.from({ length: monthCount }, (_, i) => (
              <th key={i} className="px-2 py-2 text-center text-xs font-medium uppercase text-neutral-400">
                {t("Month")} {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {rows.map((row) => (
            <tr key={row.cohortMonth}>
              <td className="px-3 py-2 font-medium text-neutral-900">{monthLabel(row.cohortMonth)}</td>
              <td className="px-3 py-2 text-neutral-500">{row.cohortSize}</td>
              {row.monthsSinceSignup.map((pct, i) => (
                <td key={i} className="px-1 py-1 text-center">
                  <div className={`rounded-md px-2 py-1.5 text-xs font-medium ${cellStyle(pct)}`}>
                    {pct === null ? "—" : `${pct}%`}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
