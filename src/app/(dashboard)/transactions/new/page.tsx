import { redirect } from "next/navigation";
import { JournalEntryForm } from "@/components/transactions/JournalEntryForm";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getAccounts } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import type { Account } from "@/lib/api";

function flatten(groups: { accounts: Account[] }[]): Account[] {
  const result: Account[] = [];
  function walk(accounts: Account[]) {
    for (const a of accounts) {
      result.push(a);
      if (a.children.length > 0) walk(a.children);
    }
  }
  for (const g of groups) walk(g.accounts);
  return result;
}

export default async function NewTransactionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const groups = await getAccounts(activeBusinessId);
  const accounts = flatten(groups).filter((a) => a.status === "ACTIVE");

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">New Journal Entry</h1>
      <p className="mt-1 text-sm text-neutral-500">Raw double-entry form -- for testing the engine. Friendly Income/Expense/Transfer forms come later.</p>

      <div className="mt-6 max-w-3xl">
        <JournalEntryForm businessId={activeBusinessId} accounts={accounts} />
      </div>
    </div>
  );
}
