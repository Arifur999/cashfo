import type { Metadata } from "next";
import LegalDocumentsTabs from "@/components/modules/Admin/Content/Legal/LegalDocumentsTabs";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { legalDocumentsQuery } from "@/queries/legalDocument.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Legal Pages" };

const LegalPagesPage = async () => {
  const admin = await getUserInfo();

  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(legalDocumentsQuery())}>
      <LegalDocumentsTabs canManage={canManage(admin?.role, "content")} />
    </QueryPrefetch>
  );
};

export default LegalPagesPage;
