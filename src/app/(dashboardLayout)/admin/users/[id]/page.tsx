import { notFound } from "next/navigation";
import { getOwnerById } from "@/lib/owners";
import { getSubscriptionPlanOptions } from "@/lib/subscriptionPlans";
import { ChangePlanButton } from "@/components/users/ChangePlanButton";
import { StatusBadge } from "@/components/users/StatusBadge";
import { UserActionsMenu } from "@/components/users/UserActionsMenu";
import { t } from "@/lib/i18n/t";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;
  const [owner, plans] = await Promise.all([getOwnerById(id), getSubscriptionPlanOptions()]);

  if (!owner) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-neutral-900">{owner.name}</h1>
              <StatusBadge status={owner.status} />
            </div>
            <p className="mt-1 text-sm text-neutral-500">{owner.email}</p>
            {owner.phone && <p className="mt-0.5 text-sm text-neutral-400">{owner.phone}</p>}
            <p className="mt-1 text-xs text-neutral-400">
              {t("Member since")} {formatDateTime(owner.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ChangePlanButton owner={owner} plans={plans} />
            <UserActionsMenu owner={owner} variant="buttons" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
          <p className="text-xs font-medium uppercase text-neutral-400">{t("Plan")}</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900">{owner.planName ?? t("None")}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
          <p className="text-xs font-medium uppercase text-neutral-400">{t("Workspaces")}</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900">{owner.workspaceCount}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
          <p className="text-xs font-medium uppercase text-neutral-400">{t("Last Login")}</p>
          <p className="mt-1 text-lg font-semibold text-neutral-900">{formatDateTime(owner.lastLoginAt)}</p>
        </div>
      </div>

      {owner.status === "SUSPENDED" && owner.suspendedReason && (
        <div className="rounded-2xl bg-orange-50 p-4 text-sm text-orange-800">
          <strong>{t("Suspended")}</strong> {formatDateTime(owner.suspendedAt)} — {owner.suspendedReason}
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm shadow-black/5">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">{t("Activity Log")}</h2>
        {owner.activityLog.length === 0 ? (
          <p className="text-sm text-neutral-400">{t("No activity recorded for this owner yet.")}</p>
        ) : (
          <ol className="space-y-4 border-l border-neutral-100 pl-4">
            {owner.activityLog.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-primary" />
                <p className="text-sm font-medium text-neutral-900">{entry.action.replaceAll("_", " ")}</p>
                <p className="text-xs text-neutral-400">
                  {formatDateTime(entry.createdAt)} {t("by")} {entry.adminName}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
