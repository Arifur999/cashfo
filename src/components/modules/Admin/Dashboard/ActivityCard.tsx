"use client";

import Avatar from "@/components/smartly/Avatar";
import { ListCell, ListRow, ListRowLink } from "@/components/smartly/list";
import { auditActionLabel } from "@/lib/auditActionLabels";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { IDashboardAuditLog } from "@/types/dashboard.types";
import { logTimeLabel } from "./dashboardDates";
import { SECTION_ROW, Section, SectionLink, SectionTable, Unavailable } from "./pieces";

interface ActivityCardProps {
  // null when the role can't read the audit trail.
  logs: IDashboardAuditLog[] | null;
}

// Who did what, most recent first, from the audit log. Each row opens its
// entry in the audit log's drawer.
export function ActivityCard({ logs }: ActivityCardProps) {
  const { translate, locale } = useLocale();
  const title = translate("Recent admin activity");
  return (
    <Section title={title} aside={<SectionLink href="/admin/security">{translate("Audit log")}</SectionLink>} flush={Boolean(logs && logs.length > 0)}>
      {logs === null ? (
        <Unavailable>{translate("Only a super admin sees the audit trail.")}</Unavailable>
      ) : logs.length === 0 ? (
        <Unavailable>{translate("No activity yet.")}</Unavailable>
      ) : (
        <SectionTable label={title}>
          {logs.map((log) => (
            <ListRow key={log.id} density="dense" className={cn(SECTION_ROW, "grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 py-2 text-small")}>
              <ListCell>
                <Avatar name={log.adminName} size={32} tone="mint" />
              </ListCell>
              <ListCell>
                <ListRowLink href={`/admin/security?entry=${encodeURIComponent(log.id)}`}>
                  <b className="font-semibold text-ink">{log.adminName}</b> <span className="text-ink-2">{translate(auditActionLabel(log.action))}</span>
                </ListRowLink>
              </ListCell>
              <ListCell align="end" className="text-caption whitespace-nowrap text-ink-muted">
                {logTimeLabel(log.createdAt, locale, { t: translate })}
              </ListCell>
            </ListRow>
          ))}
        </SectionTable>
      )}
    </Section>
  );
}
