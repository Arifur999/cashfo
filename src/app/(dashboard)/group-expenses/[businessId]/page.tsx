import { redirect } from "next/navigation";
import { GroupWorkspacePageClient } from "@/components/group-expenses/GroupWorkspacePageClient";
import type { GroupExpenseCategory } from "@/lib/api";
import { getBusinessDetailAction } from "@/lib/businessActions";
import { getCurrentUser } from "@/lib/auth";
import {
  getGroupContributions,
  getGroupExpenseCategories,
  getGroupExpenses,
  getGroupMembers,
  getGroupMonthBudgets,
  getGroupSettlement,
  getGroupSettlementHistory,
} from "@/lib/groupExpenses";

// businessId comes straight from the URL, not the "active workspace" cookie
// -- see Sidebar.tsx's comment on /group-expenses for why. Sequential
// fetches (not Promise.all), matching contacts/[id]/page.tsx's own comment
// on this app's local dev Postgres dropping connections under concurrent
// load.
export default async function GroupWorkspacePage({
  params,
  searchParams,
}: PageProps<"/group-expenses/[businessId]">) {
  const { businessId } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const businessResult = await getBusinessDetailAction(businessId);
  if (!businessResult.success || !businessResult.data || businessResult.data.type !== "GROUP") {
    redirect("/group-expenses");
  }
  const business = businessResult.data;

  const from = typeof sp.from === "string" ? sp.from : undefined;
  const to = typeof sp.to === "string" ? sp.to : undefined;
  const groupMemberId = typeof sp.memberId === "string" ? sp.memberId : undefined;
  const category = typeof sp.category === "string" ? (sp.category as GroupExpenseCategory) : undefined;

  const members = await getGroupMembers(businessId);
  const contributions = await getGroupContributions(businessId, { groupMemberId, from, to });
  const expenses = await getGroupExpenses(businessId, { category, from, to });
  const expenseCategories = await getGroupExpenseCategories(businessId);
  const settlement = await getGroupSettlement(businessId, from, to);
  const settlementHistory = await getGroupSettlementHistory(businessId);
  const monthBudgets = await getGroupMonthBudgets(businessId);

  return (
    <GroupWorkspacePageClient
      businessId={businessId}
      businessName={business.name}
      members={members}
      contributions={contributions}
      expenses={expenses}
      expenseCategories={expenseCategories}
      settlement={settlement}
      settlementHistory={settlementHistory}
      monthBudgets={monthBudgets}
    />
  );
}
