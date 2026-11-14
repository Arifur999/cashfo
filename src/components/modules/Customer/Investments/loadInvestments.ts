import { redirect } from "next/navigation";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getWallets } from "@/lib/customer/accounts";
import { getCurrentUser } from "@/lib/customer/auth";
import { getInvestments } from "@/lib/customer/investments";
import { getAppToday } from "@/lib/date";

// What every Investments page reads on the server: the open workspace, its
// investments and its wallets (archived ones too, for names).
export async function loadInvestments() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const businessId = await resolveActiveBusinessId(user.businesses);
  if (!businessId) redirect("/dashboard");
  const [investments, wallets] = await Promise.all([getInvestments(businessId), getWallets(businessId)]);
  const currency = user.businesses.find((b) => b.id === businessId)?.currency ?? "BDT";
  return { businessId, investments, wallets, currency, today: getAppToday() };
}
