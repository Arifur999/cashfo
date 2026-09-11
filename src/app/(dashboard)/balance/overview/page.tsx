import { redirect } from "next/navigation";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/currency";
import { getMoneyAccountsAction } from "@/lib/quickEntryActions";

// "Overview" is specifically about money accounts (cash/bank/mfs) --
// the full Chart of Accounts (Income/Expense/Equity included) already
// lives at /accounts ("Wallet" in this same Balance group).
export default async function BalanceOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const accounts = await getMoneyAccountsAction(activeBusinessId);
  const total = accounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">Balance Overview</h1>
      <p className="mt-1 text-sm text-neutral-500">Total across every cash, bank, and mobile money account.</p>

      <div className="mt-6 rounded-2xl bg-surface p-6 shadow-sm shadow-black/5">
        <p className="text-xs uppercase tracking-wide text-neutral-400">Total Balance</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-brand-primary">{formatCurrency(total, currency)}</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        {accounts.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">No money accounts yet.</p>
        ) : (
          <div className="divide-y divide-neutral-50">
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-neutral-700">{a.name}</span>
                <span className="text-sm font-semibold tabular-nums text-neutral-800">{formatCurrency(a.currentBalance, currency)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
