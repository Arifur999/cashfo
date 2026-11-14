import { InvestStatementClient } from "@/components/modules/Customer/Investments/InvestStatementClient";
import { InvestmentsProvider } from "@/components/modules/Customer/Investments/InvestmentsProvider";
import { loadInvestments } from "@/components/modules/Customer/Investments/loadInvestments";
import { customerPageMetadata } from "@/lib/customer/pageTitle";

export const generateMetadata = () => customerPageMetadata("/investments/statement");

// ?id= picks the investment; without one (or a deleted one) the first open
// investment shows.
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string | string[] }> }) {
  const { businessId, investments, wallets, currency, today } = await loadInvestments();
  const { id } = await searchParams;
  return (
    <InvestmentsProvider key={businessId} businessId={businessId} currency={currency} today={today} investments={investments} wallets={wallets}>
      <InvestStatementClient selectedId={typeof id === "string" ? id : null} />
    </InvestmentsProvider>
  );
}
