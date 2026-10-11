import type { Metadata } from "next";
import FlagsTable from "@/components/modules/Admin/Security/Flags/FlagsTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { securityFlagsQuery } from "@/queries/security.queries";

export const metadata: Metadata = { title: "Suspicious Activity" };

const SuspiciousActivityPage = () => {
  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(securityFlagsQuery())}>
      <FlagsTable />
    </QueryPrefetch>
  );
};

export default SuspiciousActivityPage;
