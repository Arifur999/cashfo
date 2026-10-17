import TranslationsTable from "@/components/modules/Admin/Content/Translations/TranslationsTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { translationsQuery } from "@/queries/translation.queries";
import { getUserInfo } from "@/services/auth.services";
import { adminPageTitle } from "@/lib/i18n/locale";

export const generateMetadata = adminPageTitle("Translations");

const TranslationsPage = async () => {
  const admin = await getUserInfo();

  return (
    <QueryPrefetch prefetch={(client) => client.prefetchQuery(translationsQuery())}>
      <TranslationsTable canManage={canManage(admin?.role, "content")} />
    </QueryPrefetch>
  );
};

export default TranslationsPage;
