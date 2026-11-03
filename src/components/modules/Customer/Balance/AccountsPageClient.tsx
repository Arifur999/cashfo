"use client";

import { Archive, ArchiveRestore, ArrowDown, ArrowLeftRight, ArrowUp, ArrowUpDown, Check, ChevronDown, ChevronRight, CircleCheckBig, Ellipsis, Info, Pencil, Plus, ScrollText, Search, Trash2, Wallet, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createElement, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useOnline } from "@/components/modules/Customer/Layout/useOnline";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import { ListCard, ListCell, ListEmpty, ListHead, ListHeadCell, ListRow, ListRowActions, ListRowLink } from "@/components/smartly/list";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { archiveAccountAction, removeAccountAction, unarchiveAccountAction, type ActionResult } from "@/lib/customer/accountActions";
import { accountDisplayName, displayLanguage } from "@/lib/customer/accountDisplay";
import type { WalletOverviewRow, WalletsOverview } from "@/lib/customer/api";
import { ACCOUNT_SORTS, accountColor, lastUsedText, maskedMoney, matchesAccount, moneyByType, SORT_LABEL, sortAccounts, walletColorStyle, type AccountSort } from "@/lib/customer/balanceDisplay";
import { currencySymbol, formatCurrency } from "@/lib/customer/currency";
import { maskAccountNumber, WALLET_TYPE_META, walletIcon, walletType } from "@/lib/customer/walletVisuals";
import { formatCount } from "@/lib/i18n/digits";
import { iconActionClass } from "@/components/smartly/IconAction";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { cn } from "@/lib/utils";
import { AccountDialog } from "./AccountDialog";
import { AdjustBalanceDialog } from "./AdjustBalanceDialog";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { HideBalancesButton } from "./HideBalancesButton";
import { useBalancesHidden } from "./useBalancesHidden";
import { ViewToggle, type ListView } from "../Shared/ViewToggle";
import { useStoredChoice } from "./useStoredChoice";

interface AccountsPageClientProps {
  businessId: string;
  overview: WalletsOverview;
  canManage: boolean;
  currency: string;
  // Today in the app's time zone, for "Used today".
  today: string;
}

type Tab = "active" | "archived";
const VIEWS: readonly ListView[] = ["table", "cards"];

// The table's grid: account, five movements, the balance and the menu.
// Phones scroll it sideways.
const COLUMNS = "grid-cols-[minmax(0,1fr)_repeat(5,104px)_126px_40px] min-w-240";
const MENU_ITEM = "flex h-9.5 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-small font-medium text-ink focus:bg-strip [&_svg]:size-3.75 [&_svg]:text-ink-soft";
// Money by type: the board's three colours.
const TYPE_BAR = { cash: "bg-emerald", bank: "bg-info", mfs: "bg-rose" } as const;
const TYPE_SHORT = { cash: "Cash", bank: "Bank", mfs: "Mobile" } as const;

// Accounts (board: Balance — Accounts): what the active accounts hold by
// kind, came in and went out; every account in a table (or as cards) with
// how it got to its balance, searchable and sorted by balance; each with
// its ledger, a transfer, Match real balance, edit, archive and delete.
// Balances start hidden every time the page opens.
export function AccountsPageClient({ businessId, overview, canManage, currency, today }: AccountsPageClientProps) {
  const { t, locale, fmt } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const online = useOnline();
  const { hidden, toggle } = useBalancesHidden(true);
  const [tab, setTab] = useState<Tab>("active");
  const [view, setView] = useStoredChoice<ListView>("smartly-bal-view", VIEWS, "table");
  const [sort, setSort] = useStoredChoice<AccountSort>("smartly-bal-sort", ACCOUNT_SORTS, "bal-desc");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<"closed" | "add" | WalletOverviewRow>("closed");
  const [adjusting, setAdjusting] = useState<WalletOverviewRow | null>(null);
  const [deleting, setDeleting] = useState<WalletOverviewRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ?new=1 (Home, the transfer popup's "Add a wallet") opens Add account.
  const asked = canManage && searchParams.get("new") === "1";
  const [prevAsked, setPrevAsked] = useState(false);
  if (asked !== prevAsked) {
    setPrevAsked(asked);
    if (asked) setDialog("add");
  }
  // Then the URL forgets it, so Back or a refresh doesn't open it again.
  useEffect(() => {
    if (!searchParams.has("new")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const rest = params.toString();
    window.history.replaceState(null, "", rest ? `${pathname}?${rest}` : pathname);
  }, [pathname, searchParams]);

  const lang = displayLanguage(locale);
  const nameOf = (account: WalletOverviewRow) => accountDisplayName(account, lang);
  const accounts = overview.accounts;
  const active = accounts.filter((account) => account.status !== "ARCHIVED");
  const archived = accounts.filter((account) => account.status === "ARCHIVED");
  // With nothing archived the archived tab can't stay chosen.
  const current: Tab = archived.length === 0 ? "active" : tab;
  const shown = sortAccounts(
    (current === "active" ? active : archived).filter((account) => matchesAccount(account, nameOf(account), query)),
    sort,
  );
  const searching = query.trim().length > 0;

  const symbol = currencySymbol(currency, fmt);
  const money = (value: number | string) => (hidden ? maskedMoney(symbol) : formatCurrency(value, currency, fmt));
  const signed = (value: number, sign: "+" | "−") => (hidden ? maskedMoney(symbol) : `${sign} ${formatCurrency(Math.abs(value), currency, fmt)}`);
  const sum = (pick: (account: WalletOverviewRow) => string) => active.reduce((total, account) => total + Number(pick(account)), 0);
  const shares = moneyByType(active);
  const kindOf = (account: WalletOverviewRow) => {
    const label = t(WALLET_TYPE_META[walletType(account)].label);
    const digits = (account.accountNumber ?? "").replace(/\D/g, "");
    return digits ? `${label} · ${digits.slice(-4)}` : label;
  };

  // One action on one account at a time; it dims until the answer comes.
  function act<T>(account: WalletOverviewRow, action: () => Promise<ActionResult<T>>, done: (result: ActionResult<T>) => void, failed: string) {
    if (isPending || !online) return;
    setBusyId(account.id);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.success) {
          done(result);
          router.refresh();
        } else toast.error(t(result.message ?? failed));
      } catch {
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  function setArchived(account: WalletOverviewRow, archive: boolean, undoable = true) {
    const name = nameOf(account);
    act(
      account,
      () => (archive ? archiveAccountAction(businessId, account.id) : unarchiveAccountAction(businessId, account.id)),
      () => {
        if (!archive && archived.length === 1) setTab("active");
        toast.success(t(archive ? "{name} archived" : "{name} is active again", { name }), undoable ? { action: { label: t("Undo"), onClick: () => setArchived(account, !archive, false) } } : undefined);
      },
      archive ? "Couldn't archive the account." : "Couldn't make the account active.",
    );
  }

  function remove(account: WalletOverviewRow) {
    const name = nameOf(account);
    act(
      account,
      () => removeAccountAction(businessId, account.id),
      (result) => {
        setDeleting(null);
        // The API archives one that turned out to have history after all.
        toast.success(t(result.data?.deleted ? "{name} deleted" : "{name} archived", { name }));
      },
      "Couldn't delete the account.",
    );
  }

  const menu = (account: WalletOverviewRow, onCard = false) => {
    const isArchived = account.status === "ARCHIVED";
    const busy = isPending && busyId === account.id;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={busy}
          aria-label={t("Actions for {name}", { name: nameOf(account) })}
          className={
            onCard
              ? "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full bg-white/16 text-white hover:bg-white/26 disabled:cursor-default data-open:bg-white/30 pointer-coarse:size-11"
              : cn(iconActionClass(), "relative z-10 disabled:cursor-default data-open:border-mint-200 data-open:bg-emerald-soft data-open:text-emerald")
          }
        >
          {busy ? <Loader size={16} onDark={onCard} label={t("Loading...")} /> : <Ellipsis className={onCard ? "size-4.5" : undefined} aria-hidden="true" />}
        </DropdownMenuTrigger>
        {/* A popup opened from the menu keeps its own focus: the menu doesn't hand it back to the button as it closes. */}
        <DropdownMenuContent align="end" sideOffset={6} onCloseAutoFocus={(event) => event.preventDefault()} className="w-52 rounded-xl border border-line bg-surface p-1.5 shadow-overlay ring-0">
          <DropdownMenuItem asChild className={MENU_ITEM}>
            <Link href={`/balance/ledger?accountId=${account.id}`}>
              <ScrollText aria-hidden="true" />
              {t("Open ledger")}
            </Link>
          </DropdownMenuItem>
          {canManage && !isArchived && (
            <>
              <DropdownMenuItem asChild className={MENU_ITEM}>
                <Link href={`/balance/transfer?new=1&from=${account.id}`}>
                  <ArrowLeftRight aria-hidden="true" />
                  {t("Transfer from here")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAdjusting(account)} disabled={!online} className={MENU_ITEM}>
                <CircleCheckBig aria-hidden="true" />
                {t("Match real balance")}
              </DropdownMenuItem>
            </>
          )}
          {canManage && (
            <>
              <DropdownMenuItem onSelect={() => setDialog(account)} className={MENU_ITEM}>
                <Pencil aria-hidden="true" />
                {t("Edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setArchived(account, !isArchived)} disabled={!online} className={MENU_ITEM}>
                {isArchived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
                {t(isArchived ? "Make active again" : "Archive")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-line" />
              <DropdownMenuItem onSelect={() => setDeleting(account)} disabled={!online} className={cn(MENU_ITEM, "text-expense focus:bg-expense-soft [&_svg]:text-expense")}>
                <Trash2 aria-hidden="true" />
                {t("Delete")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const head = (
    <div className="flex flex-col">
      <div className="flex items-center gap-3.5 px-4 pt-3.5 md:px-6">
        <div role="tablist" aria-label={t("Account status")} className="flex flex-1 gap-4.5">
          {(["active", "archived"] as const).map((value) => {
            const on = current === value;
            const count = value === "active" ? active.length : archived.length;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(value)}
                className={cn("flex h-10 items-center gap-1.5 border-b-2 px-0.5 text-body whitespace-nowrap", on ? "border-emerald font-semibold text-emerald" : "border-transparent font-medium text-ink-muted hover:text-ink")}
              >
                {t(value === "active" ? "Active" : "Archived@@status")}
                <span className={cn("rounded-full px-1.75 py-px text-caption font-semibold", on ? "bg-mint-50 text-brand-ink" : "bg-surface-sunken text-ink-muted")}>{formatCount(count, fmt)}</span>
              </button>
            );
          })}
        </div>
        <ViewToggle value={view} onChange={setView} order={VIEWS} />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-divider px-4 pt-3.5 pb-4 md:flex-nowrap md:px-6">
        <label className="flex h-9.5 min-w-0 flex-1 items-center gap-2 rounded-full border border-input bg-surface pr-1.5 pl-3 focus-within:border-focus-ring focus-within:focus-halo">
          <Search className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="sr-only">{t("Search accounts")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Escape" && setQuery("")}
            placeholder={t("Search accounts")}
            className="h-9 min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-faint [&::-webkit-search-cancel-button]:hidden"
          />
          {searching && (
            <button type="button" onClick={() => setQuery("")} aria-label={t("Clear search")} title={t("Clear search")} className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-2">
              <X className="size-3.25" strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${t("Sort")}: ${t(SORT_LABEL[sort])}`}
            className="flex h-9.5 items-center gap-2 rounded-full border border-input bg-surface pr-3 pl-3.5 text-[13.5px] whitespace-nowrap text-ink hover:bg-surface-sunken data-open:border-[1.5px] data-open:border-emerald"
          >
            <ArrowUpDown className="size-4 text-ink-2" aria-hidden="true" />
            <b className="font-semibold">{t(SORT_LABEL[sort])}</b>
            <ChevronDown className="size-3.75 text-ink-muted" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-50 rounded-xl border border-line bg-surface p-1.5 shadow-overlay ring-0">
            {ACCOUNT_SORTS.map((option) => (
              <DropdownMenuItem key={option} onSelect={() => setSort(option)} className={cn(MENU_ITEM, "h-10", option === sort && "bg-mint-50 font-semibold")}>
                {option === "bal-desc" ? <ArrowDown aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
                <span className="flex-1">{t(SORT_LABEL[option])}</span>
                {option === sort && <Check className="text-emerald!" strokeWidth={2.75} aria-hidden="true" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  // Nothing to list: no account at all, none archived, or none matching.
  const nothing =
    shown.length === 0 ? (
      searching ? (
        <div className="flex flex-col items-center gap-2 border-t border-divider px-6 py-9 text-center">
          <span className="text-body font-semibold text-ink">{t('No account matches "{query}"', { query: query.trim() })}</span>
          <Button variant="secondary" size="sm" onClick={() => setQuery("")}>
            {t("Clear search")}
          </Button>
        </div>
      ) : current === "archived" ? (
        <p className="border-t border-divider px-6 py-9 text-center text-body text-ink-muted">{t("No archived accounts. Accounts you archive wait here.")}</p>
      ) : (
        <ListEmpty
          icon={<Wallet />}
          title={t("No accounts yet")}
          description={t("Add your cash, bank and mobile wallets to see where your money sits.")}
          action={canManage && <Button onClick={() => setDialog("add")}>{t("Add account")}</Button>}
        />
      )
    ) : null;

  const movement = (value: number, sign: "+" | "−", tone: string) =>
    value === 0 ? <span className="text-ink-faint">—</span> : <span className={tone}>{signed(value, sign)}</span>;

  return (
    <PageFrame className="gap-6">
      <PageHeader
        title={t("Accounts@@wallets")}
        actions={
          <>
            <HideBalancesButton hidden={hidden} onToggle={toggle} />
            {canManage && (
              <Button onClick={() => setDialog("add")} className="h-10.5 rounded-full px-4.5">
                <Plus strokeWidth={2.5} className="size-4" />
                {t("Add account")}
              </Button>
            )}
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <Card padding="none" className="col-span-2 flex min-w-0 flex-col gap-2 px-4.5 py-3.5 shadow-xs md:col-span-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-[12.5px] font-medium text-ink-muted">{t("Money by type")}</span>
            <span className="text-caption font-semibold whitespace-nowrap text-ink-2">{plural(t, active.length, "{count} account", "{count} accounts", undefined, fmt)}</span>
          </span>
          <span aria-hidden="true" className="mt-0.5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-sunken">
            {!hidden && shares.filter((share) => share.amount > 0).map((share) => <span key={share.type} className={TYPE_BAR[share.type]} style={{ width: `${share.percent}%` }} />)}
          </span>
          <span className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-caption text-ink-2">
            {shares.map((share) => (
              <span key={share.type} className="inline-flex items-center gap-1.25 whitespace-nowrap">
                <span aria-hidden="true" className={cn("size-1.75 rounded-full", hidden ? "bg-ink-faint" : TYPE_BAR[share.type])} />
                {t(TYPE_SHORT[share.type])}
                {!hidden && <b className="font-semibold text-ink">{`${formatCount(share.percent, fmt)}%`}</b>}
              </span>
            ))}
          </span>
        </Card>
        <Figure label={t("Total in")} value={signed(sum((account) => account.totalIn), "+")} tone="text-income" />
        <Figure label={t("Total out")} value={signed(sum((account) => account.totalOut), "−")} tone="text-expense" />
        <Figure label={t("Available balance")} value={money(overview.availableBalance)} tone={!hidden && Number(overview.availableBalance) < 0 ? "text-expense" : "text-ink"} />
      </section>

      {view === "table" ? (
        <ListCard label={t("Accounts@@wallets")} header={head} scrollable={shown.length > 0} tableClassName="overflow-x-auto">
          {nothing ?? (
            <>
              <ListHead showOnPhone columns={COLUMNS}>
                <ListHeadCell>{t("Account")}</ListHeadCell>
                <ListHeadCell align="end">{t("Opening")}</ListHeadCell>
                <ListHeadCell align="end">{t("Money in@@wallet")}</ListHeadCell>
                <ListHeadCell align="end">
                  <HeadInfo label={t("Money out@@wallet")} hint={t("Expenses, loans given, assets bought and transfer charges")} />
                </ListHeadCell>
                <ListHeadCell align="end">
                  <HeadInfo label={t("To savings")} hint={t("Moved from this account into a savings goal")} />
                </ListHeadCell>
                <ListHeadCell align="end">
                  <HeadInfo label={t("Transfers")} hint={t("Money moved between your own accounts (+ in, − out). Transfer charges are in Money out.")} />
                </ListHeadCell>
                <ListHeadCell align="end">
                  <button type="button" onClick={() => setSort(sort === "bal-asc" ? "bal-desc" : "bal-asc")} className="inline-flex items-center gap-1 font-bold text-ink">
                    {t("Current balance")}
                    {sort === "bal-asc" ? <ArrowUp className="size-3" strokeWidth={2.5} aria-hidden="true" /> : <ArrowDown className="size-3" strokeWidth={2.5} aria-hidden="true" />}
                    <span className="sr-only">{t(SORT_LABEL[sort])}</span>
                  </button>
                </ListHeadCell>
                <ListHeadCell>
                  <span className="sr-only">{t("Actions")}</span>
                </ListHeadCell>
              </ListHead>
              {shown.map((account) => {
                const isArchived = account.status === "ARCHIVED";
                const transfers = Number(account.adjustment);
                return (
                  <ListRow key={account.id} columns={COLUMNS} muted={isArchived} className={cn("tabular-nums md:min-h-15.5", isPending && busyId === account.id && "opacity-60")}>
                    <ListCell className="flex items-center gap-3" style={walletColorStyle(accountColor(account))}>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] wallet-tile [&_svg]:size-4.25">{createElement(walletIcon(account), { "aria-hidden": true })}</span>
                      <span className="flex min-w-0 flex-col gap-px">
                        <ListRowLink href={`/balance/ledger?accountId=${account.id}`} className="truncate font-medium text-ink">
                          {nameOf(account)}
                        </ListRowLink>
                        <span className="truncate text-caption font-normal text-ink-muted">{`${kindOf(account)} · ${lastUsedText(account.lastActivity, today, t, fmt)}`}</span>
                      </span>
                    </ListCell>
                    <ListCell align="end" className="text-ink-2">
                      {money(account.openingBalance)}
                    </ListCell>
                    <ListCell align="end">{movement(Number(account.totalIn), "+", "text-emerald")}</ListCell>
                    <ListCell align="end">{movement(Number(account.totalOut), "−", "text-expense")}</ListCell>
                    <ListCell align="end">{movement(Number(account.savings), "−", "text-ink-2")}</ListCell>
                    <ListCell align="end">{movement(transfers, transfers > 0 ? "+" : "−", "text-info")}</ListCell>
                    <ListCell align="end" className={cn("font-bold", !hidden && Number(account.currentBalance) < 0 && "text-expense")}>
                      {money(account.currentBalance)}
                    </ListCell>
                    <ListRowActions>{menu(account)}</ListRowActions>
                  </ListRow>
                );
              })}
            </>
          )}
        </ListCard>
      ) : (
        <Card padding="none" className="overflow-hidden">
          {head}
          {shown.length === 0 && (searching || current === "archived" || !canManage) ? (
            nothing
          ) : (
            <div className="grid gap-4.5 px-4 pt-1 pb-6 sm:grid-cols-2 md:px-6 xl:grid-cols-3">
              {shown.map((account) => (
                <AccountCard key={account.id} account={account} name={nameOf(account)} balance={money(account.currentBalance)} menu={menu(account, true)} busy={isPending && busyId === account.id} />
              ))}
              {current === "active" && !searching && canManage && (
                <button type="button" onClick={() => setDialog("add")} className="flex h-47.5 flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-input bg-surface transition-colors hover:border-emerald hover:bg-strip">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-mint-50 text-emerald">
                    <Plus className="size-5" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <span className="text-[15px] font-semibold text-ink">{t("Add account")}</span>
                  <span className="text-small text-ink-muted">{t("Cash, bank account or mobile wallet")}</span>
                </button>
              )}
            </div>
          )}
        </Card>
      )}

      <AccountDialog
        open={dialog !== "closed"}
        onClose={() => setDialog("closed")}
        businessId={businessId}
        editing={typeof dialog === "object" ? dialog : null}
        takenNames={accounts.map((account) => ({ id: account.id, name: account.name }))}
        currency={currency}
        onSaved={(name, created) => {
          if (created) {
            setTab("active");
            setQuery("");
          }
          toast.success(t(created ? "{name} added" : "Saved", { name }));
        }}
      />
      <AdjustBalanceDialog
        account={adjusting}
        name={adjusting ? nameOf(adjusting) : ""}
        kind={adjusting ? kindOf(adjusting) : ""}
        onClose={() => setAdjusting(null)}
        businessId={businessId}
        currency={currency}
        onDone={(message, values) => toast.success(t(message, values))}
      />
      <DeleteAccountDialog
        account={deleting}
        name={deleting ? nameOf(deleting) : ""}
        busy={isPending}
        onClose={() => setDeleting(null)}
        onDelete={() => deleting && remove(deleting)}
        onArchive={() => {
          if (!deleting) return;
          setArchived(deleting, true);
          setDeleting(null);
        }}
      />
    </PageFrame>
  );
}

// One of the board's figure cards: the label and the 22px figure.
function Figure({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card padding="none" className="flex min-w-0 flex-col gap-1 px-4.5 py-3.5 shadow-xs">
      <span className="text-[12.5px] font-medium text-ink-muted">{label}</span>
      <span className={cn("text-[22px] leading-tight font-bold tracking-[-0.02em] tabular-nums wrap-anywhere", tone)}>{value}</span>
    </Card>
  );
}

// A column head with the board's ⓘ: hover or focus says what it holds.
function HeadInfo({ label, hint }: { label: string; hint: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 rounded-sm">
          {label}
          <Info className="size-3.25 text-ink-faint" aria-hidden="true" />
          <span className="sr-only">{hint}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-60 text-center">{hint}</TooltipContent>
    </Tooltip>
  );
}

interface AccountCardProps {
  account: WalletOverviewRow;
  name: string;
  balance: string;
  menu: React.ReactNode;
  busy: boolean;
}

// The card view's card: the account's colour, its kind, name and number,
// the balance, and the way to its ledger.
function AccountCard({ account, name, balance, menu, busy }: AccountCardProps) {
  const { t } = useLocale();
  const type = WALLET_TYPE_META[walletType(account)];
  const archived = account.status === "ARCHIVED";
  return (
    <div className={cn("relative", archived && "opacity-70", busy && "opacity-60")} style={walletColorStyle(accountColor(account))}>
      <Link
        href={`/balance/ledger?accountId=${account.id}`}
        className="relative flex h-47.5 flex-col justify-between overflow-hidden rounded-2xl bg-wallet-card px-5 py-4.5 text-white shadow-[0_10px_24px_rgba(18,32,29,0.14)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        <span aria-hidden="true" className="absolute -top-22.5 -right-17.5 size-55 rounded-full bg-white/7" />
        <span className="relative inline-flex items-center gap-1.5 self-start rounded-full bg-white/16 px-2.5 py-1 text-caption font-semibold [&_svg]:size-3.5">
          {createElement(type.icon, { "aria-hidden": true })}
          {t(type.label)}
          {archived && ` · ${t("Archived@@status")}`}
        </span>
        <span className="relative flex flex-col gap-0.75">
          <span className="truncate text-[17px] font-semibold">{name}</span>
          <span className="text-[12.5px] tracking-[0.08em] text-white/75 tabular-nums">{maskAccountNumber(account.accountNumber) ?? t("No account number")}</span>
        </span>
        <span className="relative flex items-end justify-between gap-3">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-caption text-white/78">{t("Current balance")}</span>
            <span className="text-[25px] leading-tight font-bold tracking-[-0.02em] tabular-nums wrap-anywhere">{balance}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/16 px-2.5 py-1.5 text-caption font-semibold">
            {t("Ledger")}
            <ChevronRight className="size-3" strokeWidth={2.5} aria-hidden="true" />
          </span>
        </span>
      </Link>
      <span className="absolute top-3.5 right-3.5 z-10">{menu}</span>
    </div>
  );
}
