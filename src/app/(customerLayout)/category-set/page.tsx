import { redirect } from "next/navigation";
import { CategorySetPageClient } from "@/components/modules/Customer/IncomeExpense/CategorySetPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { getCategorySet } from "@/lib/customer/budgets";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/category-set");

// Income & Expense > Category Set. ?new=INCOME|EXPENSE opens the New
// category popup (the transaction popup's "Add new category").
export default async function CategorySetPage({ searchParams }: PageProps<"/category-set">) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const categories = await getCategorySet(activeBusinessId);
  const active = user.businesses.find((b) => b.id === activeBusinessId);
  const role = active?.role;
  const openNew = params.new === "INCOME" || params.new === "EXPENSE" ? params.new : null;

  return <CategorySetPageClient businessId={activeBusinessId} categories={categories} canManage={role === "OWNER" || role === "ACCOUNTANT"} currency={active?.currency ?? "BDT"} openNew={openNew} />;
}
