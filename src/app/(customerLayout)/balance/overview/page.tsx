import { ArrowLeftRight, Wallet } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createElement } from "react";
import { WalletShareBar } from "@/components/modules/Customer/Balance/WalletShareBar";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { ListCard, ListCell, ListEmpty, ListFooter, ListHead, ListHeadCell, ListRow, ListRowLink, ListTotalRow } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import { getWalletsOverview } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { formatCurrency } from "@/lib/customer/currency";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { walletShares } from "@/lib/customer/walletShares";
import { WALLET_TYPE_META, walletIcon, walletPalette, walletType } from "@/lib/customer/walletVisuals";
import { formatCount } from "@/lib/i18n/digits";
import { getTranslator } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export const generateMetadata = () => customerPageMetadata("/balance/overview");

// The heads, rows and totals share one grid, which phones scroll sideways.
const COLUMNS = "grid-cols-[minmax(0,1fr)_repeat(5,116px)_140px] min-w-260";

type Totals = Record<"opening" | "in" | "out" | "savings" | "adjustment" | "current", number>;

// Balance: where the money sits right now, how it is spread across the
// wallets, and how each one got to its balance. Rows open the statement.
export default async function BalanceOverviewPage() {
  const { locale, t } = await getTranslator();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const activeBusinessId = await resolveActiveBusinessId(user.businesses);
  if (!activeBusinessId) redirect("/dashboard");

  const activeBusiness = user.businesses.find((b) => b.id === activeBusinessId);
  const currency = activeBusiness?.currency ?? "BDT";
  const canManage = activeBusiness?.role === "OWNER" || activeBusiness?.role === "ACCOUNTANT";
  const overview = await getWalletsOverview(activeBusinessId);
  const lang = displayLanguage(locale);
  const rows = overview.accounts.map((account) => ({ ...account, name: accountDisplayName(account, lang) }));
  const archivedCount = rows.filter((account) => account.status === "ARCHIVED").length;
  const activeCount = rows.length - archivedCount;
  const inArchived = Number(overview.inactiveAmount);

  const totals = rows.reduce<Totals>(
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

  // A dash for nothing, else the figure with its direction and colour.
  const figure = (value: number | string, kind: "in" | "out" | "savings" | "transfer") => {
    const amount = Number(value);
    if (amount === 0) return <span className="text-ink-muted">—</span>;
    const sign = kind === "in" || (kind === "transfer" && amount > 0) ? "+" : "−";
    const tone = kind === "in" ? "text-income" : kind === "out" ? "text-expense" : kind === "savings" ? "text-ink-2" : "text-info";
    return <span className={tone}>{`${sign} ${formatCurrency(Math.abs(amount), currency)}`}</span>;
  };

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Wallets")}`}
        title={t("Balance")}
        description={t("Where your money sits right now, and how each account got there.")}
        actions={
          // Straight into the Move money drawer; a viewer, who can't move
          // money, gets the history instead.
          <Button variant="secondary" asChild>
            <Link href={canManage ? "/balance/transfer?new=1" : "/balance/transfer"}>
              <ArrowLeftRight className="text-ink-2" />
              {canManage ? t("Move money") : t("Transfer history")}
            </Link>
          </Button>
        }
      />

      <Card padding="lg" className="flex flex-col gap-5">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-small font-medium text-ink-muted">{t("Available balance")}</span>
            <AmountText value={overview.availableBalance} currency={currency} size="display" className="font-bold tracking-[-0.02em] wrap-anywhere" />
            <span className="text-small text-ink-muted">
              {t("Total balance {amount}", { amount: formatCurrency(overview.totalBalance, currency) })}
              {inArchived !== 0 && (
                <>
                  {" · "}
                  <span className="text-ink-2">{t("{amount} in archived wallets", { amount: formatCurrency(inArchived, currency) })}</span>
                </>
              )}
            </span>
          </div>
          {/* Phones list the three one under the other; wider screens set them side by side. */}
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-0">
            <HeroStat label={t("Active wallets")} note={archivedCount > 0 ? t("{count} archived", { count: formatCount(archivedCount, locale) }) : undefined}>
              {formatCount(activeCount, locale)}
            </HeroStat>
            <HeroStat label={t("Money in@@wallet")}>{figure(totals.in, "in")}</HeroStat>
            <HeroStat label={t("Money out@@wallet")} last>
              {figure(totals.out, "out")}
            </HeroStat>
          </dl>
        </div>
        <WalletShareBar slices={walletShares(rows)} label={t("Share of balance by wallet")} legend currency={currency} />
      </Card>

      {/* The rows scroll sideways on narrower screens and their only stop is
          the account's link, so the table takes one of its own: arrow keys
          then reach the figures. An empty table has nothing to scroll. */}
      <ListCard
        label={t("Account details")}
        title={t("Account details")}
        description={rows.length > 0 ? t("Open a row to see its statement") : undefined}
        scrollable={rows.length > 0}
        tableClassName="overflow-x-auto"
        footer={
          rows.length > 0 && (
            // What the two transfer columns hold, readable on a phone and to
            // a screen reader (a hover title was neither).
            <ListFooter>
              <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[max-content_minmax(0,1fr)]">
                <dt className="font-semibold text-ink-2">{t("To savings")}</dt>
                <dd>{t("Moved from this account into a savings goal")}</dd>
                <dt className="font-semibold text-ink-2">{t("Transfers")}</dt>
                <dd>{t("Balance transfers between your own wallets (+ in, − out)")}</dd>
              </dl>
            </ListFooter>
          )
        }
      >
        {rows.length === 0 ? (
          <ListEmpty
            icon={<Wallet />}
            title={t("No wallet yet")}
            description={t("Add your cash, bank and mobile wallets to see where your money sits.")}
            action={
              canManage && (
                <Button asChild>
                  <Link href="/balance/wallet?new=1">{t("Add wallet")}</Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <ListHead showOnPhone columns={COLUMNS}>
              <ListHeadCell>{t("Account")}</ListHeadCell>
              <ListHeadCell align="end">{t("Opening")}</ListHeadCell>
              <ListHeadCell align="end">{t("Money in@@wallet")}</ListHeadCell>
              <ListHeadCell align="end">{t("Money out@@wallet")}</ListHeadCell>
              <ListHeadCell align="end">{t("To savings")}</ListHeadCell>
              <ListHeadCell align="end">{t("Transfers")}</ListHeadCell>
              <ListHeadCell align="end">{t("Current balance")}</ListHeadCell>
            </ListHead>
            {rows.map((account, index) => {
              const archived = account.status === "ARCHIVED";
              const typeLabel = t(WALLET_TYPE_META[walletType(account)].label);
              return (
                <ListRow key={account.id} columns={COLUMNS} muted={archived} className="tabular-nums">
                  <ListCell className="flex items-center gap-3">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.25", walletPalette(index).tile)}>{createElement(walletIcon(account), { "aria-hidden": true })}</span>
                    <span className="flex min-w-0 flex-col gap-px">
                      <ListRowLink href={`/balance/ledger?accountId=${account.id}`} className={cn("truncate font-medium", archived && "line-through")}>
                        {account.name}
                      </ListRowLink>
                      <span className="text-caption font-normal text-ink-muted">{archived ? `${typeLabel} · ${t("Archived@@status")}` : typeLabel}</span>
                    </span>
                  </ListCell>
                  <ListCell align="end" className="text-ink-2">
                    {formatCurrency(account.openingBalance, currency)}
                  </ListCell>
                  <ListCell align="end">{figure(account.totalIn, "in")}</ListCell>
                  <ListCell align="end">{figure(account.totalOut, "out")}</ListCell>
                  <ListCell align="end">{figure(account.savings, "savings")}</ListCell>
                  <ListCell align="end">{figure(account.adjustment, "transfer")}</ListCell>
                  <ListCell align="end" className="font-bold">
                    {formatCurrency(account.currentBalance, currency)}
                  </ListCell>
                </ListRow>
              );
            })}
            <ListTotalRow columns={COLUMNS} className="tabular-nums">
              <ListCell>{t("Total")}</ListCell>
              <ListCell align="end">{formatCurrency(totals.opening, currency)}</ListCell>
              <ListCell align="end">{figure(totals.in, "in")}</ListCell>
              <ListCell align="end">{figure(totals.out, "out")}</ListCell>
              <ListCell align="end">{figure(totals.savings, "savings")}</ListCell>
              <ListCell align="end">{figure(totals.adjustment, "transfer")}</ListCell>
              <ListCell align="end" className="text-title font-bold">
                {formatCurrency(totals.current, currency)}
              </ListCell>
            </ListTotalRow>
          </>
        )}
      </ListCard>
    </PageFrame>
  );
}

interface HeroStatProps {
  label: string;
  // A line under the figure ("1 archived").
  note?: string;
  last?: boolean;
  children: React.ReactNode;
}

function HeroStat({ label, note, last = false, children }: HeroStatProps) {
  return (
    <div className={cn("flex min-w-0 items-baseline justify-between gap-3 sm:flex-col sm:items-start sm:justify-start sm:gap-1 sm:border-l sm:border-line sm:pl-6", !last && "sm:pr-6")}>
      <dt className="text-caption font-normal text-ink-muted">{label}</dt>
      <dd className="flex flex-col items-end sm:items-start">
        <span className="text-h3 font-bold text-ink tabular-nums">{children}</span>
        {note && <span className="text-caption text-ink-muted">{note}</span>}
      </dd>
    </div>
  );
}
