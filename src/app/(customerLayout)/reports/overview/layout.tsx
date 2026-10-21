import { Suspense } from "react";
import { InsightsLoansNote, InsightsNetWorth } from "@/components/modules/Customer/Insights/InsightsNetWorth";
import { InsightsSlots } from "@/components/modules/Customer/Insights/InsightsSlots";
import { NetWorthBoundary } from "@/components/modules/Customer/Insights/NetWorthBoundary";
import { NetWorthSkeleton } from "@/components/modules/Customer/Insights/NetWorthSkeleton";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";

// Insights › Overview's net worth and loans note: read here, beside the
// page rather than in it. They stream in on their own (the period's
// figures never wait for the loan dashboard), and a failed read only blanks
// their card: net worth says so with a Try again, the loans note (which
// catches its own failure) just stays away. Since a layout isn't rendered
// again when only the period changes, switching periods doesn't read them
// again. A refresh (a new transaction, a workspace switch, that Try again)
// reads both, and brings the note back.
export default async function InsightsOverviewLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const businessId = user ? await resolveActiveBusinessId(user.businesses) : null;
  // The page sends a signed-out or workspace-less visitor on.
  if (!user || !businessId) return children;

  const currency = user.businesses.find((b) => b.id === businessId)?.currency ?? "BDT";

  return (
    <InsightsSlots
      netWorth={
        <NetWorthBoundary>
          <Suspense fallback={<NetWorthSkeleton />}>
            <InsightsNetWorth businessId={businessId} currency={currency} />
          </Suspense>
        </NetWorthBoundary>
      }
      loansNote={
        <Suspense fallback={null}>
          <InsightsLoansNote businessId={businessId} currency={currency} />
        </Suspense>
      }
    >
      {children}
    </InsightsSlots>
  );
}
