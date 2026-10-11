import type { Metadata } from "next";
import TranslationCoverage from "@/components/modules/Admin/Content/Translations/TranslationCoverage";
import TranslationsTable from "@/components/modules/Admin/Content/Translations/TranslationsTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { translationsQuery } from "@/queries/translation.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Translations" };

const TranslationsPage = async () => {
  const admin = await getUserInfo();

  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(translationsQuery())}>
      <TranslationCoverage />
      <TranslationsTable canManage={canManage(admin?.role, "content")} />
    </QueryPrefetch>
  );
};

export default TranslationsPage;
