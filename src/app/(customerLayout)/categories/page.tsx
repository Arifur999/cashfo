import { BudgetPlanningPage } from "@/components/modules/Customer/Budget/BudgetPlanningPage";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/categories");

// Budget planning: the expense limits for the month, or with ?tab=income
// (or an old ?addType=INCOME link) the Income categories tab, so the menu
// and the breadcrumb stay on Budget Planning.
export default async function CategoriesPage({ searchParams }: PageProps<"/categories">) {
  const params = await searchParams;
  const tab = params.tab === "income" || params.addType === "INCOME" ? "income" : "expense";
  return <BudgetPlanningPage path="/categories" tab={tab} params={params} />;
}
