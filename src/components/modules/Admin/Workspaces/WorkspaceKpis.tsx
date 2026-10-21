"use client";

import Kpi from "@/components/shared/Kpi";
import T from "@/components/shared/T";
import Card from "@/components/smartly/Card";
import { formatCurrency } from "@/lib/currency";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IWorkspaceOverviewSummary } from "@/types/workspace.types";

// The design's three figures and, beside them, how many workspaces the
// people with extras have: one bar per count, the longest full width.
// Counts are in the reader's digits, like the pager under the list; the
// money stays Latin.
const WorkspaceKpis = ({ summary }: { summary: IWorkspaceOverviewSummary }) => {
  const { locale } = useLocale();
  const count = (value: number) => formatCount(value, locale);
  const most = Math.max(...summary.spread.map((row) => row.users), 1);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_300px]">
      <Kpi label="People with extra workspaces" value={count(summary.totalUsers)} note={<T values={{ count: count(summary.totalAccounts) }}>{"Out of {count} accounts"}</T>} />
      {/* "Extra" is any workspace besides the person's own personal one, whatever their plan allows. */}
      <Kpi label="Extra workspaces" value={count(summary.totalAdditionalWorkspaces)} note="Besides each person's own personal workspace" />
      <Kpi label="Possible add-on revenue" value={formatCurrency(summary.totalEstimatedMonthlyAddOnRevenue)} note="A month, if add-ons were charged" />
      <Card padding="none" className="flex flex-col gap-2 px-5 py-4">
        <span className="text-small text-ink-muted">
          <T>How many workspaces they have</T>
        </span>
        {summary.spread.length === 0 && (
          <span className="text-small text-ink-muted">
            <T>Nobody has an extra workspace yet.</T>
          </span>
        )}
        {summary.spread.map((row) => (
          <div key={row.workspaces} className="flex items-center gap-2 text-small">
            <span className="w-24 shrink-0 whitespace-nowrap text-ink-2">
              <T values={{ count: count(row.workspaces) }}>{"{count} workspaces"}</T>
            </span>
            <span className="h-2 grow overflow-hidden rounded-full bg-surface-sunken">
              <span className="block h-full rounded-full bg-emerald" style={{ width: `${Math.round((row.users / most) * 100)}%` }} />
            </span>
            <span className="min-w-6 text-right font-semibold text-ink tabular-nums">{count(row.users)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
};

export default WorkspaceKpis;
