import { Wallet } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createElement } from "react";
import { HeadHint } from "@/components/modules/Customer/Balance/HeadHint";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow, ListRowLink, ListTotalRow } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { accountDisplayName, balanceText, displayLanguage } from "@/lib/customer/accountDisplay";
import { getWalletsOverview } from "@/lib/customer/accounts";
import { resolveActiveBusinessId } from "@/lib/customer/activeBusiness";
import { getCurrentUser } from "@/lib/customer/auth";
import { formatCurrency } from "@/lib/customer/currency";
import { getFmt } from "@/lib/customer/fmt";
import { customerPageMetadata } from "@/lib/customer/pageTitle";
import { WALLET_TYPE_META, walletIcon, walletPalette, walletType } from "@/lib/customer/walletVisuals";
import { formatCount } from "@/lib/i18n/digits";
import { getTranslator } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

export const generateMetadata = () => customerPageMetadata("/balance/overview");

// The heads, rows and totals share one grid, which phones scroll sideways.
// Phones bring Current balance, the figure people come for, next to the
// account (CURRENT first, the five movements after it), so the first screen
// doesn't read as Account and Opening alone. Grid placement follows
// `order`, so heads, rows and the total stay lined up; wider screens keep
// the board's order.
const COLUMNS = "grid-cols-[minmax(0,1fr)_repeat(5,116px)_140px] max-md:grid-cols-[minmax(0,1fr)_140px_repeat(5,116px)] min-w-260";
const CURRENT = "max-md:order-1";
const MOVEMENT = "max-md:order-2";

type Totals = Record<"opening" | "in" | "out" | "savings" | "adjustment" | "current", number>;

// Balance: where the money sits right now, how it is spread across the
// wallets, and how each one got to its balance. Rows open the statement.
export default async function BalanceOverviewPage() {
  const { locale, t } = await getTranslator();
  const fmt = await getFmt();
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
    if (amount === 0) return <span className="text-ink-faint">—</span>;
    const sign = kind === "in" || (kind === "transfer" && amount > 0) ? "+" : "−";
    const tone = kind === "in" ? "text-income" : kind === "out" ? "text-expense" : kind === "savings" ? "text-ink-2" : "text-info";
    return <span className={tone}>{`${sign} ${formatCurrency(Math.abs(amount), currency, fmt)}`}</span>;
  };
  // An overdrawn balance takes the true minus the figures beside it use
  // (the cell turns expense red), not a hyphen against the symbol.
  const balance = (value: number | string) => balanceText(value, currency, fmt);

  return (
    <PageFrame className="gap-6">
      <PageHeader title={t("Balance overview")} />

      {/* The board's four figures; an archived wallet's count and money say so under them. */}
      <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <FigureCard label={t("Accounts")} note={archivedCount > 0 ? t("{count} archived", { count: formatCount(archivedCount, fmt) }) : undefined}>
          {formatCount(activeCount, fmt)}
        </FigureCard>
        <FigureCard label={t("Total in")}>{figure(totals.in, "in")}</FigureCard>
        <FigureCard label={t("Total out")}>{figure(totals.out, "out")}</FigureCard>
        <FigureCard
          label={t("Available balance")}
          note={inArchived !== 0 ? t("{amount} in archived wallets", { amount: formatCurrency(inArchived, currency, fmt) }) : undefined}
        >
          <span className={Number(overview.availableBalance) < 0 ? "text-expense" : "text-ink"}>{balance(overview.availableBalance)}</span>
        </FigureCard>
      </section>

      {/* The rows scroll sideways on narrower screens and their only stop is
          the account's link, so the table takes one of its own: arrow keys
          then reach the figures. An empty table has nothing to scroll. */}
      <ListCard
        label={t("Account details")}
        title={t("Account details")}
        actions={rows.length > 0 ? <span className="text-small text-ink-muted">{t("Click a row to open its ledger")}</span> : undefined}
        scrollable={rows.length > 0}
        tableClassName="overflow-x-auto"
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
              <ListHeadCell align="end" className={MOVEMENT}>
                {t("Opening")}
              </ListHeadCell>
              <ListHeadCell align="end" className={MOVEMENT}>
                {t("Money in@@wallet")}
              </ListHeadCell>
              <ListHeadCell align="end" className={MOVEMENT}>
                {t("Money out@@wallet")}
              </ListHeadCell>
              {/* What the two transfer columns hold: the board's ⓘ, which
                  a tap opens too (a hover title alone reached no phone). */}
              <ListHeadCell align="end" className={cn("flex items-center justify-end gap-1 overflow-visible", MOVEMENT)}>
                {t("To savings")}
                <HeadHint label={t("To savings")} hint={t("Moved from this account into a savings goal")} />
              </ListHeadCell>
              <ListHeadCell align="end" className={cn("flex items-center justify-end gap-1 overflow-visible", MOVEMENT)}>
                {t("Transfers")}
                <HeadHint label={t("Transfers")} hint={t("Balance transfers between your own wallets (+ in, − out)")} />
              </ListHeadCell>
              <ListHeadCell align="end" className={CURRENT}>
                {t("Current balance")}
              </ListHeadCell>
            </ListHead>
            {rows.map((account, index) => {
              const archived = account.status === "ARCHIVED";
              const typeLabel = t(WALLET_TYPE_META[walletType(account)].label);
              return (
                <ListRow key={account.id} columns={COLUMNS} muted={archived} className="tabular-nums md:min-h-15">
                  <ListCell className="flex items-center gap-3">
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-4.25", walletPalette(index).tile)}>{createElement(walletIcon(account), { "aria-hidden": true })}</span>
                    <span className="flex min-w-0 flex-col gap-px">
                      <ListRowLink href={`/balance/ledger?accountId=${account.id}`} className={cn("truncate font-medium", archived && "line-through")}>
                        {account.name}
                      </ListRowLink>
                      <span className="text-caption font-normal text-ink-muted">{archived ? `${typeLabel} · ${t("Archived@@status")}` : typeLabel}</span>
                    </span>
                  </ListCell>
                  <ListCell align="end" className={cn("text-ink-2", MOVEMENT)}>
                    {formatCurrency(account.openingBalance, currency, fmt)}
                  </ListCell>
                  <ListCell align="end" className={MOVEMENT}>
                    {figure(account.totalIn, "in")}
                  </ListCell>
                  <ListCell align="end" className={MOVEMENT}>
                    {figure(account.totalOut, "out")}
                  </ListCell>
                  <ListCell align="end" className={MOVEMENT}>
                    {figure(account.savings, "savings")}
                  </ListCell>
                  <ListCell align="end" className={MOVEMENT}>
                    {figure(account.adjustment, "transfer")}
                  </ListCell>
                  <ListCell align="end" className={cn("font-bold", CURRENT, Number(account.currentBalance) < 0 && "text-expense")}>
                    {balance(account.currentBalance)}
                  </ListCell>
                </ListRow>
              );
            })}
            <ListTotalRow columns={COLUMNS} className="min-h-14 tabular-nums">
              <ListCell>{t("Total")}</ListCell>
              <ListCell align="end" className={MOVEMENT}>
                {formatCurrency(totals.opening, currency, fmt)}
              </ListCell>
              <ListCell align="end" className={MOVEMENT}>
                {figure(totals.in, "in")}
              </ListCell>
              <ListCell align="end" className={MOVEMENT}>
                {figure(totals.out, "out")}
              </ListCell>
              <ListCell align="end" className={MOVEMENT}>
                {figure(totals.savings, "savings")}
              </ListCell>
              <ListCell align="end" className={MOVEMENT}>
                {totals.adjustment === 0 ? <span className="text-ink-muted">{formatCurrency(0, currency, fmt)}</span> : figure(totals.adjustment, "transfer")}
              </ListCell>
              <ListCell align="end" className={cn("text-[15px] font-bold", CURRENT, totals.current < 0 && "text-expense")}>
                {balance(totals.current)}
              </ListCell>
            </ListTotalRow>
          </>
        )}
      </ListCard>
    </PageFrame>
  );
}

// One of the board's figure cards: the label, the 22px figure, and a line
// under it when there is one.
function FigureCard({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <Card className="flex min-w-0 flex-col gap-1.5">
      <span className="text-small text-ink-muted">{label}</span>
      <span className="text-[22px] leading-tight font-bold text-ink tabular-nums wrap-anywhere">{children}</span>
      {note && <span className="text-caption text-ink-muted">{note}</span>}
    </Card>
  );
}
