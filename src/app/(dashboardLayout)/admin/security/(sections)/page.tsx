import { AUDIT_LOG_TABLE_BASE_CONFIG } from "@/components/modules/Admin/Security/AuditLog/auditLogTable.config";
import AuditLogTable from "@/components/modules/Admin/Security/AuditLog/AuditLogTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { buildTableQueryString } from "@/lib/queryString";
import { adminAccountsQuery, auditLogsListQuery } from "@/queries/security.queries";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Audit log");

const AuditLogPage = async ({ searchParams }: PageProps<"/admin/security">) => {
  const queryString = buildTableQueryString(await searchParams, AUDIT_LOG_TABLE_BASE_CONFIG);

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
