import { redirect } from "next/navigation";
import { getWalletsOverview } from "@/lib/accounts";
import { resolveActiveBusinessId } from "@/lib/activeBusiness";
import { getCurrentUser } from "@/lib/auth";
import { accountDisplayName } from "@/lib/accountDisplay";
import { formatCurrency } from "@/lib/currency";
import { getLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/translate";

// "Overview" is specifically about money accounts (cash/bank/mfs) --
// the full Chart of Accounts (Income/Expense/Equity included) lives at
// Wallet's sibling, the /accounts page, still reachable but not directly
// linked from this sidebar group.
export default async function BalanceOverviewPage() {
  const locale = await getLocale();
  const t = (key: string) => translate(locale, key);

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const overview = await getWalletsOverview(activeBusinessId);

  const totals = overview.accounts.reduce(
    (sum, a) => ({
      opening: sum.opening + Number(a.openingBalance),
      in: sum.in + Number(a.totalIn),
      out: sum.out + Number(a.totalOut),
      savings: sum.savings + Number(a.savings),
      adjustment: sum.adjustment + Number(a.adjustment),
      current: sum.current + Number(a.currentBalance),
    }),
    { opening: 0, in: 0, out: 0, savings: 0, adjustment: 0, current: 0 },
  );

  // Signed "+"/"-" prefix on the absolute value, rather than relying on
  // formatCurrency's own negative-number formatting (which would put the
  // minus sign after the currency symbol, e.g. "৳-500.00") -- same
  // "show direction as an explicit sign/label, not a raw negative" instinct
  // as the Loan Dashboard's Dena/Pawna split.
  function formatSigned(value: string) {
    const n = Number(value);
    const prefix = n > 0 ? "+" : n < 0 ? "-" : "";
    return `${prefix}${formatCurrency(Math.abs(n), currency)}`;
  }

  return (
    <div className="h-full bg-brand-content px-6 py-8">
      <h1 className="text-xl font-semibold text-neutral-900">{t("Balance Overview")}</h1>
      <p className="mt-1 text-sm text-neutral-500">{t("Account Balance Overview")}</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("Total Accounts")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-neutral-900">{overview.totalAccounts}</p>
        </div>
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("Total Balance")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-primary">{formatCurrency(overview.totalBalance, currency)}</p>
        </div>
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("Inactive Amount")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-danger">{formatCurrency(overview.inactiveAmount, currency)}</p>
        </div>
        <div className="rounded-2xl bg-surface p-5 shadow-sm shadow-black/5">
          <p className="text-xs uppercase tracking-wide text-neutral-400">{t("Available Balance")}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-brand-primary">{formatCurrency(overview.availableBalance, currency)}</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-surface shadow-sm shadow-black/5">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-900">{t("Account Details")}</h2>
        </div>

        {overview.accounts.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-neutral-400">{t("No money accounts yet.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">{t("Account")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("Opening")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("Total In")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("Total Out")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("Savings")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("Adjustment")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("Current Balance")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {overview.accounts.map((a, index) => {
                  const isInactive = a.status === "ARCHIVED";
                  const adjustmentNum = Number(a.adjustment);
                  const adjustmentColor = adjustmentNum > 0 ? "text-brand-primary" : adjustmentNum < 0 ? "text-brand-danger" : "text-neutral-400";
                  return (
                    <tr key={a.id} className={isInactive ? "bg-brand-danger/5" : ""}>
                      <td className="px-4 py-2.5 text-neutral-400">{index + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-neutral-700 ${isInactive ? "line-through" : ""}`}>
                          {accountDisplayName(a, user.preferredLanguage)}
                        </span>
                        {isInactive && (
                          <span className="ml-2 rounded-full bg-brand-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-danger">
                            {t("Inactive")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-600">{formatCurrency(a.openingBalance, currency)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-brand-primary">{formatCurrency(a.totalIn, currency)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-brand-danger">{formatCurrency(a.totalOut, currency)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-neutral-600">
                        {Number(a.savings) > 0 ? formatCurrency(a.savings, currency) : <span className="text-neutral-300">—</span>}
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${adjustmentColor}`}>{formatSigned(a.adjustment)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-neutral-900">{formatCurrency(a.currentBalance, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-200 text-sm font-bold text-neutral-900">
                  <td className="px-4 py-3" colSpan={2}>
                    {t("Total")}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totals.opening, currency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-primary">{formatCurrency(totals.in, currency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-danger">{formatCurrency(totals.out, currency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-700">{formatCurrency(totals.savings, currency)}</td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${totals.adjustment > 0 ? "text-brand-primary" : totals.adjustment < 0 ? "text-brand-danger" : "text-neutral-400"}`}
                  >
                    {formatSigned(totals.adjustment.toFixed(2))}
                  </td>
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
