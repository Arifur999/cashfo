import type { Metadata } from "next";
import AccountTreePanel from "@/components/modules/Admin/Content/Accounts/AccountTreePanel";
import CategoriesPanel from "@/components/modules/Admin/Content/Categories/CategoriesPanel";
import QueryPrefetch from "@/components/shared/QueryPrefetch";
import { canManage } from "@/lib/authUtils";
import { accountTemplatesQuery } from "@/queries/accountTemplate.queries";
import { categoriesQuery } from "@/queries/category.queries";
import { getUserInfo } from "@/services/auth.services";

export const metadata: Metadata = { title: "Categories" };

// What a new workspace starts with: its categories on the left, its
// account tree on the right (the accounts also feed the category form's
// "linked account" picker).
const CategoriesPage = async () => {
  const admin = await getUserInfo();
  const canEdit = canManage(admin?.role, "content");

  return (
    <QueryPrefetch prefetch={(client) => Promise.all([client.prefetchQuery(categoriesQuery()), client.prefetchQuery(accountTemplatesQuery())])}>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <CategoriesPanel canManage={canEdit} />
        <AccountTreePanel canManage={canEdit} />
      </div>
    </QueryPrefetch>
  );
};

export default CategoriesPage;
