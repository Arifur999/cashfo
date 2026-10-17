import LegalPages from "@/components/modules/Admin/Content/Legal/LegalPages";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { legalDocumentsQuery } from "@/queries/legalDocument.queries";
import { getUserInfo } from "@/services/auth.services";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Legal pages");

const LegalPagesPage = async () => {
  const admin = await getUserInfo();

  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(legalDocumentsQuery())}>
      <LegalPages canManage={canManage(admin?.role, "content")} />
    </QueryPrefetch>
  );
};

export default LegalPagesPage;
