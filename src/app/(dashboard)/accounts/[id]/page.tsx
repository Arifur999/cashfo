import { notFound, redirect } from "next/navigation";
import { AccountDetailPageClient } from "@/components/accounts/AccountDetailPageClient";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getAccount, getAccountSummary, getLedger } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { resolveDateRange, type DateRangePreset } from "@/lib/dateRangePresets";

export default async function AccountDetailPage({ params, searchParams }: PageProps<"/accounts/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const account = await getAccount(activeBusinessId, id);
  if (!account) notFound();

  const preset = (typeof sp.range === "string" ? sp.range : "all") as DateRangePreset;
  const customFrom = typeof sp.dateFrom === "string" ? sp.dateFrom : undefined;
  const customTo = typeof sp.dateTo === "string" ? sp.dateTo : undefined;
  const { dateFrom, dateTo } = resolveDateRange(preset, customFrom, customTo);
  const page = typeof sp.page === "string" ? Number(sp.page) : 1;

  const [ledger, summary] = await Promise.all([
    getLedger(activeBusinessId, id, { dateFrom, dateTo, page }),
    getAccountSummary(activeBusinessId, id, { dateFrom, dateTo }),
  ]);

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);

  return (
    <AccountDetailPageClient
      account={account}
      ledger={ledger}
      summary={summary}
      preferredLanguage={user.preferredLanguage}
      currency={activeBusiness?.currency ?? "BDT"}
      preset={preset}
      customFrom={customFrom}
      customTo={customTo}
    />
  );
}
