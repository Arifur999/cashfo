import { redirect } from "next/navigation";
import { AiInsightsPageClient } from "@/components/modules/Customer/AiInsights/AiInsightsPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getAiInsights } from "@/lib/customer/aiInsights";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/ai-insights");

// AI Insights: advice worked out from the open workspace's own numbers,
// once the person turns it on. Its owner and accountant keep its money, so
// only they see it; "View as customer" may look, not change.
export default async function AiInsightsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canSee = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const page = canSee ? await getAiInsights(activeBusinessId) : null;

  return <AiInsightsPageClient businessId={activeBusinessId} page={page} canSee={canSee} currency={activeBusiness?.currency ?? "BDT"} readOnly={Boolean(user.impersonatedBy)} />;
}
