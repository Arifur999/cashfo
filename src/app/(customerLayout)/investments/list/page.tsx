import { InvestListClient } from "@/components/modules/Customer/Investments/InvestListClient";
import { InvestmentsProvider } from "@/components/modules/Customer/Investments/InvestmentsProvider";
import { loadInvestments } from "@/components/modules/Customer/Investments/loadInvestments";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/investments/list");

export default async function Page() {
  const { businessId, investments, wallets, currency, today } = await loadInvestments();
  // Keyed by workspace: a switch must not carry this one's popups over.
  return (
    <InvestmentsProvider key={businessId} businessId={businessId} currency={currency} today={today} investments={investments} wallets={wallets}>
      <InvestListClient />
    </InvestmentsProvider>
  );
}
