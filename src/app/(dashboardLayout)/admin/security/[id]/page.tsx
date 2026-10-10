import { notFound } from "next/navigation";
import { getAuditLogById } from "@/lib/security";
import { requireSuperAdmin } from "@/lib/requireSuperAdmin";
import { SensitiveBadge, isSensitiveEntry } from "@/components/security/SensitiveBadge";
import { ValueDiff } from "@/components/security/ValueDiff";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { t } from "@/lib/i18n/t";

interface AuditLogDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AuditLogDetailPage({ params }: AuditLogDetailPageProps) {
  await requireSuperAdmin();

  const { id } = await params;
  const log = await getAuditLogById(id);

  if (!log) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex flex-wrap items-center gap-2">
          {isSensitiveEntry(log.newValue) && <SensitiveBadge />}
          <h1 className="text-lg font-semibold text-neutral-900">{auditActionLabel(log.action)}</h1>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase text-neutral-400">{t("Admin")}</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">{log.adminUser.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-neutral-400">{t("Entity")}</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">
              {log.entityType}
              {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-neutral-400">{t("IP Address")}</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">{log.ipAddress ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-neutral-400">{t("Date")}</dt>
            <dd className="mt-0.5 text-sm text-neutral-900">{new Date(log.createdAt).toLocaleString()}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm shadow-black/5">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">{t("What changed")}</h2>
        <ValueDiff oldValue={log.oldValue} newValue={log.newValue} />
      </div>
    </div>
  );
}
