"use client";

import Link from "next/link";
import { ADMIN_ROLE_AVATAR } from "@/lib/adminRoles";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getInitials } from "@/lib/text";
import { cn } from "@/lib/utils";
import type { IDashboardAuditLog } from "@/types/dashboard.types";
import { logTimeLabel } from "./dashboardDates";
import { Section, SectionLink, Unavailable } from "./pieces";

interface ActivityCardProps {
  logs: IDashboardAuditLog[];
}

// Who did what, most recent first, from the audit log: 28px initials in the
// admin's role colours, the admin, the action, what it was on and why, the
// time on the right. Each row opens its entry in
// the audit log's drawer.
export function ActivityCard({ logs }: ActivityCardProps) {
  const { translate, locale } = useLocale();
  const title = translate("Recent admin activity");
  return (
    <Section title={title} aside={<SectionLink href="/admin/security">{translate("Audit log")}</SectionLink>} className="h-full gap-2.5">
      {logs.length === 0 ? (
        <Unavailable>{translate("No activity yet.")}</Unavailable>
      ) : (
        <ul className="flex flex-col">
          {logs.map((log) => (
            <li key={log.id} className="border-b border-divider last:border-b-0">
              <Link
                href={`/admin/security?entry=${encodeURIComponent(log.id)}`}
                className="flex items-center gap-2.5 rounded-sm py-2 text-small transition-colors hover:bg-hover pointer-coarse:min-h-11"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[10.5px] leading-[normal] font-bold",
                    (log.adminRole && ADMIN_ROLE_AVATAR[log.adminRole]) || "bg-mint-50 text-emerald",
                  )}
                >
                  {getInitials(log.adminName) || "?"}
                </span>
                <span className="min-w-0 flex-1 leading-[1.4]">
                  <b className="font-semibold text-ink">{log.adminName}</b> <span className="text-ink-2">{translate(auditActionLabel(log.action)).toLowerCase()}</span>
                  {log.entityLabel && <span className="text-ink-2"> · {log.entityLabel}</span>}
                  {log.reason && <span className="text-ink-muted"> ({log.reason})</span>}
                </span>
                <span className="shrink-0 text-caption whitespace-nowrap text-ink-faint">{logTimeLabel(log.createdAt, locale, { t: translate })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
