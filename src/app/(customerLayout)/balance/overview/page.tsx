import { ArrowLeftRight, Info, Wallet } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createElement } from "react";
import { WalletShareBar } from "@/components/modules/Customer/Balance/WalletShareBar";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import EmptyState from "@/components/smartly/EmptyState";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import { getWalletsOverview } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import type { WalletOverviewRow } from "@/lib/customer/api";
import { getCurrentUser } from "@/lib/customer/auth";
import { formatCurrency } from "@/lib/customer/currency";
import { walletShares } from "@/lib/customer/walletShares";
import { WALLET_TYPE_META, walletIcon, walletPalette, walletType } from "@/lib/customer/walletVisuals";
import { getTranslator } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

const GRID = "grid-cols-[minmax(0,1fr)_repeat(5,116px)_140px]";

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
  const overview = await getWalletsOverview(activeBusinessId);
  const lang = displayLanguage(locale);
  const rows = overview.accounts.map((account) => ({ ...account, name: accountDisplayName(account, lang) }));

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
  const figure = (value: number | string, kind: "in" | "out" | "savings" | "transfer", className?: string) => {
    const amount = Number(value);
    if (amount === 0) return <span className={cn("text-right text-ink-muted", className)}>—</span>;
    const sign = kind === "in" || (kind === "transfer" && amount > 0) ? "+" : "−";
    const tone = kind === "in" ? "text-income" : kind === "out" ? "text-expense" : kind === "savings" ? "text-ink-2" : "text-info";
    return <span className={cn("text-right tabular-nums", tone, className)}>{`${sign} ${formatCurrency(Math.abs(amount), currency)}`}</span>;
  };

  const headInfo = (label: string, title: string) => (
    <span className="flex items-center justify-end gap-1" title={title}>
      {label}
      <Info className="size-3.25 text-ink-faint" aria-hidden="true" />
    </span>
  );

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Wallets")}`}
        title={t("Balance")}
        description={t("Where your money sits right now, and how each account got there.")}
        actions={
          <Button variant="secondary" asChild>
            <Link href="/balance/transfer">
              <ArrowLeftRight className="text-ink-2" />
              {t("Move money")}
            </Link>
          </Button>
        }
      />

      <Card padding="lg" className="flex flex-col gap-5">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-small font-medium text-ink-muted">{t("Available balance")}</span>
            <AmountText value={overview.availableBalance} currency={currency} size="display" className="font-bold tracking-[-0.02em]" />
            <span className="text-small text-ink-muted">
              {t("Total balance")} {formatCurrency(overview.totalBalance, currency)} · <span className="text-ink-2">{formatCurrency(overview.inactiveAmount, currency)} {t("in archived wallets")}</span>
            </span>
          </div>
          <div className="grid grid-cols-3">
            <HeroStat label={t("Accounts")}>{overview.totalAccounts}</HeroStat>
            <HeroStat label={t("Money in")}>{figure(totals.in, "in", "text-left")}</HeroStat>
            <HeroStat label={t("Money out")} last>
              {figure(totals.out, "out", "text-left")}
            </HeroStat>
          </div>
        </div>
        <WalletShareBar slices={walletShares(rows)} label={t("Share of balance by wallet")} legend currency={currency} />
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <h2 className="text-title text-ink">{t("Account details")}</h2>
          <span className="text-small text-ink-muted">{t("Click a row to open its ledger")}</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            bordered={false}
            icon={<Wallet />}
            title={t("No wallet yet")}
            description={t("Add your cash, bank and mobile wallets to see where your money sits.")}
            action={
              <Button asChild>
                <Link href="/balance/wallet">{t("Add wallet")}</Link>
              </Button>
            }
            className="border-t border-line"
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-260">
              <div className={cn("grid items-center gap-x-4 border-y border-line bg-cream px-6 py-3 text-caption text-ink-muted", GRID)}>
                <span>{t("Account")}</span>
                <span className="text-right">{t("Opening")}</span>
                <span className="text-right">{t("Money in")}</span>
                <span className="text-right">{t("Money out")}</span>
                {headInfo(t("To savings"), t("Moved from this account into a savings goal"))}
                {headInfo(t("Transfers"), t("Balance transfers between your own wallets (+ in, − out)"))}
                <span className="text-right">{t("Current balance")}</span>
              </div>
              {rows.map((account, index) => (
                <OverviewRow key={account.id} account={account} index={index} currency={currency} figure={figure} typeLabel={t(WALLET_TYPE_META[walletType(account)].label)} archivedLabel={t("Archived")} />
              ))}
              <div className={cn("grid h-14 items-center gap-x-4 bg-cream px-6 text-body font-semibold text-ink tabular-nums", GRID)}>
                <span>{t("Total")}</span>
                <span className="text-right">{formatCurrency(totals.opening, currency)}</span>
                {figure(totals.in, "in")}
                {figure(totals.out, "out")}
                {figure(totals.savings, "savings")}
                {figure(totals.adjustment, "transfer")}
                <span className="text-right text-title font-bold">{formatCurrency(totals.current, currency)}</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </PageFrame>
  );
}

function HeroStat({ label, last = false, children }: { label: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1 border-l border-line pl-6", !last && "pr-6")}>
      <span className="text-caption font-normal text-ink-muted">{label}</span>
      <span className="text-h3 font-bold text-ink tabular-nums">{children}</span>
    </div>
  );
}

interface OverviewRowProps {
  account: WalletOverviewRow;
  index: number;
  currency: string;
  figure: (value: string, kind: "in" | "out" | "savings" | "transfer") => React.ReactNode;
  typeLabel: string;
  archivedLabel: string;
}

function OverviewRow({ account, index, currency, figure, typeLabel, archivedLabel }: OverviewRowProps) {
  const archived = account.status === "ARCHIVED";
  return (
    <Link href={`/balance/ledger?accountId=${account.id}`} className={cn("grid h-15 items-center gap-x-4 border-b border-surface-sunken px-6 text-body text-ink tabular-nums transition-colors hover:bg-cream", GRID, archived && "opacity-60")}>
      <span className="flex min-w-0 items-center gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.25", walletPalette(index).tile)}>{createElement(walletIcon(account), { "aria-hidden": true })}</span>
        <span className="flex min-w-0 flex-col gap-px">
          <span className={cn("truncate font-medium", archived && "line-through")}>{account.name}</span>
          <span className="text-caption font-normal text-ink-muted">{archived ? `${typeLabel} · ${archivedLabel}` : typeLabel}</span>
        </span>
      </span>
      <span className="text-right text-ink-2">{formatCurrency(account.openingBalance, currency)}</span>
      {figure(account.totalIn, "in")}
      {figure(account.totalOut, "out")}
      {figure(account.savings, "savings")}
      {figure(account.adjustment, "transfer")}
      <span className="text-right font-bold">{formatCurrency(account.currentBalance, currency)}</span>
    </Link>
  );
}
