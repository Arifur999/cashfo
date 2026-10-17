"use client";

import Avatar from "@/components/smartly/Avatar";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { formatDate, toDateInputValue } from "@/lib/date";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IDashboardAuditLog } from "@/types/dashboard.types";
import { Section, SectionLink, Unavailable } from "./pieces";

interface ActivityCardProps {
  // null when the role can't read the audit trail.
  logs: IDashboardAuditLog[] | null;
}

// Who did what, most recent first, from the audit log.
export function ActivityCard({ logs }: ActivityCardProps) {
  const { translate } = useLocale();
  const today = toDateInputValue(new Date());
  return (
    <Section title={translate("Recent admin activity")} aside={<SectionLink href="/admin/security">{translate("Audit log")}</SectionLink>}>
      {logs === null ? (
        <Unavailable>{translate("Only a super admin sees the audit trail.")}</Unavailable>
      ) : logs.length === 0 ? (
        <Unavailable>{translate("No activity yet.")}</Unavailable>
      ) : (
        <ul className="flex flex-col">
          {logs.map((log) => (
            <li key={log.id} className="flex items-center gap-3 border-b border-surface-sunken py-2 text-small last:border-b-0">
              <Avatar name={log.adminName} size={32} tone="mint" />
              <span className="min-w-0 flex-1 leading-snug">
                <b className="font-semibold text-ink">{log.adminName}</b> <span className="text-ink-2">{translate(auditActionLabel(log.action))}</span>
              </span>
              <span className="shrink-0 text-caption text-ink-muted">{formatDate(log.createdAt, toDateInputValue(log.createdAt) === today ? "h:mm a" : "d MMM")}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
