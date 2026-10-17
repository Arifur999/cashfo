import Kpi from "@/components/shared/Kpi";
import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/currency";
import { formatNumber } from "@/lib/number";
import type { IWorkspaceOverviewSummary } from "@/types/workspace.types";

// The design's three figures and, beside them, how many workspaces the
// people with extras have: one bar per count, the longest full width.
const WorkspaceKpis = ({ summary }: { summary: IWorkspaceOverviewSummary }) => {
  const most = Math.max(...summary.spread.map((row) => row.users), 1);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_300px]">
      <Kpi label="People with extra workspaces" value={formatNumber(summary.totalUsers)} note={`Out of ${formatNumber(summary.totalAccounts)} accounts`} />
      <Kpi label="Extra workspaces" value={formatNumber(summary.totalAdditionalWorkspaces)} note="On top of the one each plan includes" />
      <Kpi label="Possible add-on revenue" value={formatCurrency(summary.totalEstimatedMonthlyAddOnRevenue)} note="A month, if add-ons were charged" />
      <Card padding="none" className="flex flex-col gap-2 px-5 py-4">
        <span className="text-small text-ink-muted">How many workspaces they have</span>
        {summary.spread.length === 0 && <span className="text-small text-ink-muted">Nobody has an extra workspace yet.</span>}
        {summary.spread.map((row) => (
          <div key={row.workspaces} className="flex items-center gap-2 text-small">
            <span className="w-24 shrink-0 whitespace-nowrap text-ink-2">{row.workspaces} workspaces</span>
            <span className="h-2 grow overflow-hidden rounded-full bg-surface-sunken">
              <span className="block h-full rounded-full bg-emerald" style={{ width: `${Math.round((row.users / most) * 100)}%` }} />
            </span>
            <span className="w-6 text-right font-semibold text-ink tabular-nums">{formatNumber(row.users)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
};

export default WorkspaceKpis;
