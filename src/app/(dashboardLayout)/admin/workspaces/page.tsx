import Link from "next/link";
import { DollarSign, Layers, Users } from "lucide-react";
import { getWorkspaceOverview } from "@/lib/workspaces";
import { SummaryCard } from "@/components/payments/SummaryCard";
import { t } from "@/lib/i18n/t";

interface WorkspacesPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

// Decimal columns arrive from the backend as fixed-2dp strings (see
// CLAUDE.md's "Money values from Prisma arrive as strings" note) -- parse for
// thousands-grouping, same idea as payments/page.tsx's formatMoney, but kept
// local since this is the only place on this page that needs it.
function formatBdt(amount: string): string {
  const value = Number(amount);
  return `BDT ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function WorkspacesPage({ searchParams }: WorkspacesPageProps) {
  const params = await searchParams;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;
  const limit = 20;

  const { summary, items, totalCount } = await getWorkspaceOverview(`page=${page}&limit=${limit}`);
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("Workspaces")}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t("Real end-user accounts with more than one workspace, and the estimated add-on revenue they represent.")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard icon={Users} label={t("Total Users (w/ Extra Workspaces)")} value={summary.totalUsers.toLocaleString()} />
        <SummaryCard icon={Layers} label={t("Total Additional Workspaces")} value={summary.totalAdditionalWorkspaces.toLocaleString()} />
        <SummaryCard
          icon={DollarSign}
          label={t("Est. Monthly Add-On Revenue")}
          value={formatBdt(summary.totalEstimatedMonthlyAddOnRevenue)}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm shadow-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Name")}</th>
              <th className="px-4 py-3 font-medium">{t("Email")}</th>
              <th className="px-4 py-3 font-medium">{t("Plan")}</th>
              <th className="px-4 py-3 font-medium">{t("Total Workspaces")}</th>
              <th className="px-4 py-3 font-medium">{t("Additional Workspaces")}</th>
              <th className="px-4 py-3 font-medium">{t("Est. Monthly Add-On Fee")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {items.map((item) => (
              <tr key={item.userId} className="hover:bg-neutral-50/60">
                <td className="px-4 py-3 font-medium text-neutral-900">{item.name}</td>
                <td className="px-4 py-3 text-neutral-500">{item.email}</td>
                <td className="px-4 py-3 text-neutral-500">{item.planName ?? "—"}</td>
                <td className="px-4 py-3 text-neutral-500">{item.totalWorkspaces}</td>
                <td className="px-4 py-3 text-neutral-500">{item.additionalWorkspaces}</td>
                <td className="px-4 py-3 text-neutral-900">{formatBdt(item.estimatedMonthlyAddOnRevenue)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                  {t("No users own more than one workspace yet.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm shadow-sm shadow-black/5">
        <span className="text-neutral-500">
          {t("Page")} {page} {t("of")} {totalPages} &middot; {totalCount} {t("total")}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/workspaces?page=${page - 1}`}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-600 hover:bg-neutral-50"
            >
              {t("Previous")}
            </Link>
          ) : (
            <span className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-300">{t("Previous")}</span>
          )}
          {page < totalPages ? (
            <Link
              href={`/admin/workspaces?page=${page + 1}`}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-600 hover:bg-neutral-50"
            >
              {t("Next")}
            </Link>
          ) : (
            <span className="rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-300">{t("Next")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
