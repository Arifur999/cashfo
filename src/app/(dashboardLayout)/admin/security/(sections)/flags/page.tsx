import FlagsBoard from "@/components/modules/Admin/Security/Flags/FlagsBoard";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { securityFlagsQuery } from "@/queries/security.queries";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Suspicious activity");

const SuspiciousActivityPage = () => {
  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(securityFlagsQuery())}>
      <FlagsBoard />
    </QueryPrefetch>
  );
};

export default SuspiciousActivityPage;
