import { AlertTriangle, DollarSign, LifeBuoy, ShieldAlert, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/adminAuth";
import { getDashboardSummary } from "@/lib/dashboard";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { SummaryCard } from "@/components/payments/SummaryCard";
import { t } from "@/lib/i18n/t";

export default async function DashboardPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  const summary = await getDashboardSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">
          {t("Welcome,")} {admin.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{t("Here's what's happening across the platform.")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={Users} label={t("Total Users")} value={summary.totalUsers.toLocaleString()} />
        <SummaryCard icon={UserPlus} label={t("New Users (30d)")} value={summary.newUsersLast30d.toLocaleString()} />
        {summary.mrr !== null && (
          <SummaryCard icon={DollarSign} label={t("MRR")} value={`BDT ${summary.mrr.toLocaleString()}`} />
        )}
        <SummaryCard icon={LifeBuoy} label={t("Open Tickets")} value={summary.openTickets.toLocaleString()} />
        {summary.pendingFlags !== null && (
          <SummaryCard icon={ShieldAlert} label={t("Pending Flags")} value={summary.pendingFlags.toLocaleString()} />
        )}
      </div>

      {(summary.lastBackup || summary.recentAuditLogs) && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {summary.lastBackup && (
            <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-neutral-400" />
                <h2 className="text-sm font-semibold text-neutral-900">{t("Last Successful Backup")}</h2>
              </div>
              <p className="text-lg font-semibold text-neutral-900">
                {summary.lastBackup.completedAt ? new Date(summary.lastBackup.completedAt).toLocaleString() : t("Never")}
              </p>
              {summary.lastBackup.sizeMb !== null && (
                <p className="mt-0.5 text-sm text-neutral-500">{summary.lastBackup.sizeMb} MB</p>
              )}
              <Link href="/admin/system" className="mt-3 inline-block text-sm font-medium text-brand-primary hover:underline">
                {t("View Backups")} &rarr;
              </Link>
            </div>
          )}

          {summary.recentAuditLogs && (
            <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">{t("Recent Activity")}</h2>
              {summary.recentAuditLogs.length === 0 ? (
                <p className="text-sm text-neutral-400">{t("No recent activity.")}</p>
              ) : (
                <ul className="space-y-2.5">
                  {summary.recentAuditLogs.map((log) => (
                    <li key={log.id} className="text-sm">
                      <span className="text-neutral-900">{auditActionLabel(log.action)}</span>
                      <span className="text-neutral-400">
                        {" "}
                        &middot; {log.adminName} &middot; {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/security" className="mt-3 inline-block text-sm font-medium text-brand-primary hover:underline">
                {t("View Audit Log")} &rarr;
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
