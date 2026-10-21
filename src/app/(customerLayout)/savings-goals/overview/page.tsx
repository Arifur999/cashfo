import { PiggyBank } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WalletShareBar } from "@/components/modules/Customer/Balance/WalletShareBar";
import { RestoreWalletButton } from "@/components/modules/Customer/SavingsGoals/RestoreWalletButton";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import { ListCard, ListCell, ListHead, ListHeadCell, ListRow, ListRowLink, ListTotalRow } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { getSavingsWallets } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { formatCurrency } from "@/lib/customer/currency";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { summaryPalette } from "@/lib/customer/savingsDisplay";
import { getSavingsAccountOverview } from "@/lib/customer/savingsGoals";
import { walletShares } from "@/lib/customer/walletShares";
import { formatCount } from "@/lib/i18n/digits";
import { getTranslator } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export const generateMetadata = () => customerPageMetadata("/savings-goals/overview");

// Five money columns need about 880px, so from md to lg the table scrolls
// sideways (heads included) rather than squeeze the wallet names away. On a
// phone each row stacks to name | balance, as the other lists do, with what
// went in and out under the name.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_repeat(3,140px)_160px]";
// The three middle figures, left out of a phone's name | balance row.
const MIDDLE = "max-md:hidden";
const BALANCE = "max-md:col-start-2 max-md:row-start-1";

// Savings summary: what sits in the savings wallets altogether, how it is
// spread, and what went in and out of each one. Goals are targets; this is
// the money.
export default async function SavingsOverviewPage() {
  const { locale, t } = await getTranslator();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  // The wallets Savings wallets lists, so each row here takes the colour
  // its wallet has there.
  const [overview, activeWallets] = await Promise.all([getSavingsAccountOverview(activeBusinessId), getSavingsWallets(activeBusinessId)]);
  const activeIds = activeWallets.map((wallet) => wallet.id);
  const rows = overview.accounts;
  // Every wallet counts in every figure here, archived ones too, as the
  // Total row adds them.
  const totals = rows.reduce(
    (sum, a) => ({ opening: sum.opening + Number(a.openingBalance), in: sum.in + Number(a.totalIn), out: sum.out + Number(a.totalOut), current: sum.current + Number(a.currentBalance) }),
    { opening: 0, in: 0, out: 0, current: 0 },
  );
  const archived = rows.filter((row) => row.status === "ARCHIVED").length;

  // An archived wallet's figures go grey rather than green and red. A
  // wallet's row shows nothing as a dash; a total says ৳0 (`zero`), since a
  // dash there would read as no data.
  const zeroTotal = formatCurrency(0, currency);
  const outFigure = (value: number, muted = false, zero = "—") => <span className={cn("tabular-nums", value > 0 && !muted ? "text-expense" : "text-ink-muted")}>{value > 0 ? `− ${formatCurrency(value, currency)}` : zero}</span>;
  const inFigure = (value: number, muted = false, zero = "—") => <span className={cn("tabular-nums", value > 0 && !muted ? "text-income" : "text-ink-muted")}>{value > 0 ? `+ ${formatCurrency(value, currency)}` : zero}</span>;

  return (
    <PageFrame className="gap-6">
      <PageHeader eyebrow={`${t("Money")} · ${t("Savings")}`} title={t("Savings summary")} description={t("Goals are targets. Savings wallets are where the money actually sits.")} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<PiggyBank />}
          title={t("No savings wallet yet")}
          description={canManage ? t("Add the DPS, FDR or other account you save in, and your saved money shows up here.") : t("Ask the workspace owner to add a savings wallet.")}
          action={
            canManage && (
              <Button asChild>
                <Link href="/savings-goals/wallet?add=1">{t("Add savings wallet")}</Link>
              </Button>
            )
          }
          className="min-h-80"
        />
      ) : (
        <>
          <Card padding="lg" className="flex flex-col gap-4">
            {/* Side by side from xl only: below it a lakh-sized balance and
                three figures don't fit on one line, so md and lg keep the
                full-width strip under the balance, as sm does. From xl the
                balance gives way first (its second line wraps), and the
                figures drop under it only when the balance alone leaves
                them no room. */}
            <div className="flex flex-col gap-6 xl:flex-row xl:flex-wrap xl:items-end xl:justify-between">
              <div className="flex flex-col gap-2 xl:flex-1">
                <span className="text-small font-medium text-ink-muted">{t("In your savings wallets")}</span>
                <AmountText value={overview.totalBalance} currency={currency} size="display" className="font-bold tracking-[-0.02em]" />
                <span className="text-small text-ink-muted tabular-nums">
                  {t("Available {amount}", { amount: formatCurrency(overview.availableBalance, currency) })}
                  {archived > 0 && ` · ${t("{amount} in archived wallets", { amount: formatCurrency(overview.inactiveAmount, currency) })}`}
                </span>
              </div>
              {/* Rows on a phone (label left, figure right); three equal
                  columns from sm, and from xl, beside the balance, each one
                  as wide as its figure so the last ends flush right. */}
              <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-[repeat(3,auto)]">
                <Stat label={t("Wallets")} first>
                  {formatCount(rows.length, locale)}
                  {archived > 0 && <span className="text-small font-medium text-ink-muted"> · {t("{count} archived", { count: formatCount(archived, locale) })}</span>}
                </Stat>
                <Stat label={t("Added")}>{inFigure(totals.in, false, zeroTotal)}</Stat>
                <Stat label={t("Taken out")} last>
                  {outFigure(totals.out, false, zeroTotal)}
                </Stat>
              </div>
            </div>
            <WalletShareBar slices={walletShares(rows, (index) => summaryPalette(rows[index].id, activeIds))} label={t("Share of savings by wallet")} legend currency={currency} />
          </Card>

          <ListCard
            label={t("Savings wallets")}
            // The link stays beside the title on a phone too.
            header={
              <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 md:px-6 md:py-5">
                <h2 className="text-title text-ink">{t("Savings wallets")}</h2>
                <Link href="/savings-goals/wallet" className="inline-flex shrink-0 items-center text-small font-semibold text-emerald hover:text-emerald-hover pointer-coarse:min-h-11">
                  {t("Manage wallets")}
                </Link>
              </div>
            }
            tableClassName="md:overflow-x-auto"
            // From md to lg, narrower than the five columns, it scrolls
            // sideways: in the tab order, the keyboard can reach Opening
            // through Balance too.
            scrollable
          >
            <div role="rowgroup" className="md:min-w-220">
              <ListHead columns={COLUMNS}>
                <ListHeadCell>{t("Wallet")}</ListHeadCell>
                <ListHeadCell align="end">{t("Opening")}</ListHeadCell>
                <ListHeadCell align="end">{t("Added")}</ListHeadCell>
                <ListHeadCell align="end">{t("Taken out")}</ListHeadCell>
                <ListHeadCell align="end">{t("Balance")}</ListHeadCell>
              </ListHead>
              {rows.map((row) => {
                const isArchived = row.status === "ARCHIVED";
                const added = Number(row.totalIn) > 0;
                const takenOut = Number(row.totalOut) > 0;
                // Set back by colour, not by fading the row: a faded row
                // would fade its Restore button into looking disabled.
                return (
                  <ListRow key={row.id} columns={COLUMNS} density="relaxed" className="tabular-nums">
                    <ListCell className="flex items-center gap-3">
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", summaryPalette(row.id, activeIds).tile)}>
                        <PiggyBank className="size-4.5" aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-col gap-px">
                        {/* Opens the wallet's statement; the whole row is the target. */}
                        <ListRowLink href={`/balance/ledger?accountId=${row.id}`} className={cn("truncate font-medium", isArchived ? "text-ink-muted line-through" : "text-ink")}>
                          {row.name}
                        </ListRowLink>
                        <span className="flex items-center gap-2">
                          <span className="text-caption font-normal text-ink-muted">{isArchived ? t("Archived") : t("Savings wallet")}</span>
                          {/* Above the row's link, so it restores rather than opens. */}
                          {isArchived && canManage && <RestoreWalletButton businessId={activeBusinessId} walletId={row.id} walletName={row.name} className="relative z-10 -my-1" />}
                        </span>
                        {/* A phone's row has no Added and Taken out columns. */}
                        {(added || takenOut) && (
                          <span className="text-caption font-normal text-ink-muted md:hidden">
                            {added && inFigure(Number(row.totalIn), isArchived)}
                            {added && takenOut && " · "}
                            {takenOut && outFigure(Number(row.totalOut), isArchived)}
                          </span>
                        )}
                      </span>
                    </ListCell>
                    <ListCell align="end" className={cn(MIDDLE, isArchived ? "text-ink-muted" : "text-ink-2")}>
                      {formatCurrency(row.openingBalance, currency)}
                    </ListCell>
                    <ListCell align="end" className={MIDDLE}>
                      {inFigure(Number(row.totalIn), isArchived)}
                    </ListCell>
                    <ListCell align="end" className={MIDDLE}>
                      {outFigure(Number(row.totalOut), isArchived)}
                    </ListCell>
                    <ListCell align="end" className={cn(BALANCE, "font-bold", isArchived && "text-ink-muted")}>
                      {formatCurrency(row.currentBalance, currency)}
                    </ListCell>
                  </ListRow>
                );
              })}
              <ListTotalRow columns={COLUMNS} className="tabular-nums">
                <ListCell>{t("Total")}</ListCell>
                <ListCell align="end" className={MIDDLE}>
                  {formatCurrency(totals.opening, currency)}
                </ListCell>
                <ListCell align="end" className={MIDDLE}>
                  {inFigure(totals.in, false, zeroTotal)}
                </ListCell>
                <ListCell align="end" className={MIDDLE}>
                  {outFigure(totals.out, false, zeroTotal)}
                </ListCell>
                <ListCell align="end" className={cn(BALANCE, "text-title font-bold")}>
                  {formatCurrency(totals.current, currency)}
                </ListCell>
              </ListTotalRow>
            </div>
          </ListCard>
        </>
      )}
    </PageFrame>
  );
}

// One figure of the hero strip: a row with the figure on the right on a
// phone, a column with a line before it from sm. Before the first one there
// is only a line from xl, where the strip sits beside the balance.
function Stat({ label, first = false, last = false, children }: { label: string; first?: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-2.5 sm:flex-col sm:items-start sm:justify-start sm:gap-1 sm:border-l sm:border-line sm:py-0 sm:pl-6",
        first ? "sm:border-l-0 sm:pl-0 xl:border-l xl:pl-6" : "border-t border-divider sm:border-t-0",
        !last && "sm:pr-6",
      )}
    >
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      <span className="text-h3 font-bold whitespace-nowrap text-ink tabular-nums">{children}</span>
    </div>
  );
}
