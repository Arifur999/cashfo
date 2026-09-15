import { redirect } from "next/navigation";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/currency";
import { getSavingsAccountOverview } from "@/lib/savingsGoals";

// Mirrors Balance's own Overview page (same cards, same table shape) --
// scoped to Savings Goals instead of real money accounts. Each "row" is a
// SavingsGoal: no per-goal opening balance (goals only ever start at 0),
// and "Inactive" means status != ACTIVE (Paused or Completed) rather than
// AccountStatus.ARCHIVED. Read-only, same reasoning as the Savings Wallet
// page -- nothing here is created/edited directly.
export default async function SavingsOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const overview = await getSavingsAccountOverview(activeBusinessId);

  const totals = overview.accounts.reduce(
    (sum, a) => ({
      in: sum.in + Number(a.totalIn),
      out: sum.out + Number(a.totalOut),
      current: sum.current + Number(a.currentBalance),
    }),
    { in: 0, out: 0, current: 0 },
  );

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">Savings Overview</h1>
      <p className="mt-1 text-sm text-neutral-500">Savings Account Overview</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Total Accounts</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">{overview.totalAccounts}</p>
        </div>
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Total Balance</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-primary">{formatCurrency(overview.totalBalance, currency)}</p>
        </div>
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Inactive Amount</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-danger">{formatCurrency(overview.inactiveAmount, currency)}</p>
        </div>
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Available Balance</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-primary">{formatCurrency(overview.availableBalance, currency)}</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-900">Account Details</h2>
        </div>

        {overview.accounts.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">No savings goals yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium text-right">Opening</th>
                  <th className="px-4 py-3 font-medium text-right">Total In</th>
                  <th className="px-4 py-3 font-medium text-right">Total Out</th>
                  <th className="px-4 py-3 font-medium text-right">Current Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {overview.accounts.map((a, index) => {
                  const isInactive = a.status !== "ACTIVE";
                  return (
                    <tr key={a.id} className={isInactive ? "bg-brand-danger/5" : ""}>
                      <td className="px-4 py-2.5 text-neutral-400">{index + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-neutral-700 ${isInactive ? "line-through" : ""}`}>{a.name}</span>
                        {isInactive && (
                          <span className="ml-2 rounded-full bg-brand-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-danger">
                            {a.status === "PAUSED" ? "Paused" : "Completed"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-600">{formatCurrency(a.openingBalance, currency)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-brand-primary">{formatCurrency(a.totalIn, currency)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-brand-danger">{formatCurrency(a.totalOut, currency)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-neutral-900">{formatCurrency(a.currentBalance, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-200 text-sm font-bold text-neutral-900">
                  <td className="px-4 py-3" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(0, currency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-primary">{formatCurrency(totals.in, currency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-danger">{formatCurrency(totals.out, currency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totals.current, currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
