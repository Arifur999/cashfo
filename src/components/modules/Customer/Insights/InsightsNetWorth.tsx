import { unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { getWalletsOverview } from "@/lib/customer/accounts";
import { assetsSummary } from "@/lib/customer/assetDisplay";
import { getAssets } from "@/lib/customer/assets";
import { loanCounts } from "@/lib/customer/homeInsights";
import { netWorth } from "@/lib/customer/insights";
import { getLoanDashboard } from "@/lib/customer/receivablesPayables";
import { getSavingsAccountOverview } from "@/lib/customer/savingsGoals";
import { LoansNote } from "./LoansNote";
import { NetWorthCard } from "./NetWorthCard";

// Server Components: Insights' net worth and the loans note under What
// changed, read apart from the period's figures. The overview layout wraps
// each in its own Suspense, so a slow loan dashboard only holds up its own
// card; a failed read blanks net worth through its error boundary, and the
// loans note just leaves itself out.

// Everything net worth is made of, read once a request for both parts.
const readNetWorth = cache(async (businessId: string) => {
  const [wallets, savings, assets, loans] = await Promise.all([getWalletsOverview(businessId), getSavingsAccountOverview(businessId), getAssets(businessId), getLoanDashboard(businessId)]);
  return {
    worth: netWorth({
      wallets: Number(wallets.totalBalance),
      savings: Number(savings.totalBalance),
      assets: assetsSummary(assets).totalValue,
      owedToYou: Number(loans.totalPawna),
      youOwe: Number(loans.totalDena),
    }),
    youOweCount: loanCounts(loans.rows).youOwe,
  };
});

interface PartProps {
  businessId: string;
  currency: string;
}

export async function InsightsNetWorth({ businessId, currency }: PartProps) {
  const { worth } = await readNetWorth(businessId);
  return <NetWorthCard worth={worth} currency={currency} />;
}

// A failed read is caught here rather than by a client boundary, which keeps
// its error until the visitor leaves the page: the note would stay hidden
// even after net worth's Try again or a refresh read the loans fine. Caught
// on the server, it comes back with the next render. The net worth card
// says what failed.
export async function InsightsLoansNote({ businessId, currency }: PartProps) {
  const parts = await readNetWorth(businessId).catch((error: unknown) => {
    // A redirect (signed out) and Next's own render signals still get through.
    unstable_rethrow(error);
    return null;
  });
  return parts && <LoansNote worth={parts.worth} youOweCount={parts.youOweCount} currency={currency} />;
}
