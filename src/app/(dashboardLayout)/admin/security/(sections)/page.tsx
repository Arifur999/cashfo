import { redirect } from "next/navigation";
import { AUDIT_LOG_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Security/AuditLog/auditLogTable.config";
import AuditLogTable from "@/components/modules/Admin/Security/AuditLog/AuditLogTable";
import { hrefWithoutUnknownWithin } from "@/components/modules/Admin/Security/knownWithin";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { buildTableQueryString } from "@/lib/queryString";
import { adminAccountsQuery, auditLogsListQuery } from "@/queries/security.queries";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Audit log");

const AuditLogPage = async ({ searchParams }: PageProps<"/admin/security">) => {
  const params = await searchParams;
  // A window the API refuses would fail every read: open on the default instead.
  const fixed = hrefWithoutUnknownWithin("/admin/security", params);
  if (fixed !== null) redirect(fixed);
  const queryString = buildTableQueryString(params, AUDIT_LOG_TABLE_BASE_CONFIG);

  return (
    // The admin roster feeds the "Admin" filter.
    <QueryPrefetch
      prefetch={(client) => Promise.all([client.prefetchQuery(auditLogsListQuery(queryString)), client.prefetchQuery(adminAccountsQuery())])}
    >
      <AuditLogTable />
    </QueryPrefetch>
  );
};

export default AuditLogPage;
