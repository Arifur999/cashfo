import { redirect } from "next/navigation";
import { ZakatPageClient } from "@/components/modules/Customer/Zakat/ZakatPageClient";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { getZakatSummary } from "@/lib/customer/zakat";

export const generateMetadata = () => customerPageMetadata("/zakat");

// Zakat calculator: the year's zakat worked out from the open workspace's
// wallets, savings, assets and loans, the member's checks of each step, and
// the zakat they recorded giving. Its owner and accountant keep its money,
// so only they see it.
export default async function ZakatPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const canSee = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const summary = canSee ? await getZakatSummary(activeBusinessId) : null;

  return (
    <ZakatPageClient
      businessId={activeBusinessId}
      summary={summary}
      canSee={canSee}
      currency={activeBusiness?.currency ?? "BDT"}
      // "View as customer" may look, not change.
      readOnly={Boolean(user.impersonatedBy)}
    />
  );
}
