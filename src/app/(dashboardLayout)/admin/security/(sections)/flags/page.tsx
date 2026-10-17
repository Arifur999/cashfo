import type { Metadata } from "next";
import FlagsBoard from "@/components/modules/Admin/Security/Flags/FlagsBoard";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { securityFlagsQuery } from "@/queries/security.queries";

export const metadata: Metadata = { title: "Suspicious activity" };

const SuspiciousActivityPage = () => {
  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(securityFlagsQuery())}>
      <FlagsBoard />
    </QueryPrefetch>
  );
};

export default SuspiciousActivityPage;
