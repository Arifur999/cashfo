import type { Metadata } from "next";
import CategoriesTable from "@/components/modules/Admin/Content/Categories/CategoriesTable";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { accountTemplatesQuery } from "@/queries/accountTemplate.queries";
import { categoriesQuery } from "@/queries/category.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Categories" };

const CategoriesPage = async () => {
  const admin = await getUserInfo();

  return (
    // The accounts feed the "linked account" picker in the category form.
    <QueryPrefetch
      prefetch={(client) => Promise.all([client.prefetchQuery(categoriesQuery()), client.prefetchQuery(accountTemplatesQuery())])}
    >
      <CategoriesTable canManage={canManage(admin?.role, "content")} />
    </QueryPrefetch>
  );
};

export default CategoriesPage;
