import { PiggyBank } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WalletShareBar } from "@/components/modules/Customer/Balance/WalletShareBar";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { formatCurrency } from "@/lib/customer/currency";
import { savingsPalette } from "@/lib/customer/savingsDisplay";
import { getSavingsAccountOverview } from "@/lib/customer/savingsGoals";
import { walletShares } from "@/lib/customer/walletShares";
import { getTranslator } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const GRID = "grid-cols-[minmax(0,1fr)_repeat(3,140px)_160px]";

// Savings summary: what sits in the savings wallets altogether, how it is
// spread, and what went in and out of each one. Goals are targets; this is
// the money.
export default async function SavingsOverviewPage() {
  const { t } = await getTranslator();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const overview = await getSavingsAccountOverview(activeBusinessId);
  const rows = overview.accounts;
  const totals = rows.reduce(
    (sum, a) => ({ opening: sum.opening + Number(a.openingBalance), in: sum.in + Number(a.totalIn), out: sum.out + Number(a.totalOut), current: sum.current + Number(a.currentBalance) }),
    { opening: 0, in: 0, out: 0, current: 0 },
  );
  const archived = rows.filter((row) => row.status === "ARCHIVED").length;

  const outFigure = (value: number, className?: string) => <span className={cn("text-right tabular-nums", value > 0 ? "text-expense" : "text-ink-muted", className)}>{value > 0 ? `− ${formatCurrency(value, currency)}` : "—"}</span>;
  const inFigure = (value: number, className?: string) => <span className={cn("text-right tabular-nums", value > 0 ? "text-income" : "text-ink-muted", className)}>{value > 0 ? `+ ${formatCurrency(value, currency)}` : "—"}</span>;

  return (
    <PageFrame className="gap-6">
      <PageHeader eyebrow={`${t("Money")} · ${t("Savings")}`} title={t("Savings summary")} description={t("Goals are targets. Savings wallets are where the money actually sits.")} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<PiggyBank />}
          title={t("No savings wallet yet")}
          description={t("Add the DPS, FDR or other account you save in, and your saved money shows up here.")}
          action={
            <Button asChild>
              <Link href="/savings-goals/wallet">{t("Add savings wallet")}</Link>
            </Button>
          }
          className="min-h-80"
        />
      ) : (
        <>
          <Card padding="lg" className="flex flex-col gap-4">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col gap-2">
                <span className="text-small font-medium text-ink-muted">{t("In your savings wallets")}</span>
                <AmountText value={overview.totalBalance} currency={currency} size="display" className="font-bold tracking-[-0.02em]" />
                <span className="text-small text-ink-muted tabular-nums">
                  {t("Available")} {formatCurrency(overview.availableBalance, currency)} · {formatCurrency(overview.inactiveAmount, currency)} {t("in archived wallets")}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <Stat label={t("Wallets")}>{rows.length - archived}</Stat>
                <Stat label={t("Added")}>{inFigure(totals.in, "text-left")}</Stat>
                <Stat label={t("Taken out")} last>
                  {outFigure(totals.out, "text-left")}
                </Stat>
              </div>
            </div>
            <WalletShareBar slices={walletShares(rows, savingsPalette)} label={t("Share of savings by wallet")} legend currency={currency} />
          </Card>

          <Card padding="none" className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-6 py-5">
              <h2 className="text-title text-ink">{t("Savings wallets")}</h2>
              <Link href="/savings-goals/wallet" className="text-small font-semibold text-emerald hover:text-emerald-hover">
                {t("Manage wallets")}
              </Link>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-220">
                <div className={cn("grid items-center gap-x-4 border-y border-line bg-cream px-6 py-3 text-caption text-ink-muted", GRID)}>
                  <span>{t("Wallet")}</span>
                  <span className="text-right">{t("Opening")}</span>
                  <span className="text-right">{t("Added")}</span>
                  <span className="text-right">{t("Taken out")}</span>
                  <span className="text-right">{t("Balance")}</span>
                </div>
                {rows.map((row, index) => (
                  <Link key={row.id} href={`/balance/ledger?accountId=${row.id}`} className={cn("grid h-15 items-center gap-x-4 border-b border-surface-sunken px-6 text-body text-ink tabular-nums transition-colors hover:bg-cream", GRID, row.status === "ARCHIVED" && "opacity-60")}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", savingsPalette(index).tile)}>
                        <PiggyBank className="size-4.5" aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-col gap-px">
                        <span className={cn("truncate font-medium", row.status === "ARCHIVED" && "line-through")}>{row.name}</span>
                        <span className="text-caption font-normal text-ink-muted">{row.status === "ARCHIVED" ? t("Archived") : t("Savings wallet")}</span>
                      </span>
                    </span>
                    <span className="text-right text-ink-2">{formatCurrency(row.openingBalance, currency)}</span>
                    {inFigure(Number(row.totalIn))}
                    {outFigure(Number(row.totalOut))}
                    <span className="text-right font-bold">{formatCurrency(row.currentBalance, currency)}</span>
                  </Link>
                ))}
                <div className={cn("grid h-14 items-center gap-x-4 bg-cream px-6 text-body font-semibold text-ink tabular-nums", GRID)}>
                  <span>{t("Total")}</span>
                  <span className="text-right">{formatCurrency(totals.opening, currency)}</span>
                  {inFigure(totals.in)}
                  {outFigure(totals.out)}
                  <span className="text-right text-title font-bold">{formatCurrency(totals.current, currency)}</span>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </PageFrame>
  );
}

function Stat({ label, last = false, children }: { label: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1 border-l border-line pl-6", !last && "pr-6")}>
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      <span className="text-h3 font-bold text-ink tabular-nums">{children}</span>
    </div>
  );
}
