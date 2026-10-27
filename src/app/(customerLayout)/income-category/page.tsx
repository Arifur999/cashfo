import { BudgetPlanningPage } from "@/components/modules/Customer/Budget/BudgetPlanningPage";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/income-category");

// The Income Category menu entry: Budget planning's Income categories tab,
// at its own address so that entry stays lit.
export default async function IncomeCategoryPage({ searchParams }: PageProps<"/income-category">) {
  const params = await searchParams;
  return <BudgetPlanningPage path="/income-category" tab="income" params={params} />;
}
