"use client";

import { ArrowLeftRight, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import AmountText from "@/components/smartly/AmountText";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import TabBar from "@/components/smartly/TabBar";
import { archiveAccountAction, removeAccountAction, unarchiveAccountAction, type ActionResult } from "@/lib/customer/accountActions";
import type { Account } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { walletShares } from "@/lib/customer/walletShares";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { TransferDrawer } from "./TransferDrawer";
import { WalletCard } from "./WalletCard";
import { WalletDrawer } from "./WalletDrawer";
import { WalletShareBar } from "./WalletShareBar";

interface WalletPageClientProps {
  businessId: string;
  wallets: Account[];
  canManage: boolean;
  currency: string;
}

type Tab = "active" | "archived";

const sum = (wallets: Account[], pick: (wallet: Account) => string) => wallets.reduce((total, wallet) => total + Number(pick(wallet)), 0);

// My wallets: what they hold altogether, then one card per wallet with its
// actions, and a dashed card to add the next one. Archived wallets wait on
// their own tab.
export function WalletPageClient({ businessId, wallets, canManage, currency }: WalletPageClientProps) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [tab, setTab] = useState<Tab>("active");
  const [drawer, setDrawer] = useState<"closed" | "create" | Account>("closed");
  const [moving, setMoving] = useState(false);
  // The wallet an archive, unarchive or remove is working on.
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ?new=1 (Balance's Add wallet, the Move money drawer's Add a wallet)
  // opens the add drawer.
  const asked = canManage && searchParams.get("new") === "1";
  const [prevAsked, setPrevAsked] = useState(false);
  if (asked !== prevAsked) {
    setPrevAsked(asked);
    if (asked) setDrawer("create");
  }
  // Then the URL forgets it, so Back or a refresh doesn't open it again.
  useEffect(() => {
    if (!searchParams.has("new")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  const active = wallets.filter((wallet) => wallet.status !== "ARCHIVED");
  const archived = wallets.filter((wallet) => wallet.status === "ARCHIVED");
  // With nothing archived the tabs hide on phones, so the archived tab can't
  // stay chosen (unarchiving the last wallet used to leave an empty page).
  const current: Tab = archived.length === 0 ? "active" : tab;
  const shown = current === "active" ? active : archived;
  // What the active wallets hold: the Balance page's "Available balance".
  const available = sum(active, (wallet) => wallet.currentBalance);
  const inArchived = sum(archived, (wallet) => wallet.currentBalance);
  const totalOpening = sum(active, (wallet) => wallet.openingBalance);
  const editing = typeof drawer === "object" ? drawer : null;
  const busy = isPending ? busyId : null;
  const activeCount = formatCount(active.length, locale);
  const archivedNote = inArchived !== 0 ? t("{amount} in archived wallets", { amount: formatCurrency(inArchived, currency) }) : null;

  // One action on one wallet at a time: its card dims and its menu waits
  // until the answer comes back.
  function act<T>(wallet: Account, action: () => Promise<ActionResult<T>>, done: (result: ActionResult<T>) => void, failed: string) {
    if (isPending) return;
    setBusyId(wallet.id);
    startTransition(async () => {
      try {
        const result = await action();
        if (result.success) {
          done(result);
          router.refresh();
        } else {
          toast.error(result.message ?? t(failed));
        }
      } catch {
        // No answer at all (offline): nothing changed.
        toast.error(t("Couldn't reach Smartly. Check your connection and try again."));
      }
    });
  }

  function toggleArchive(wallet: Account) {
    const isArchived = wallet.status === "ARCHIVED";
    act(
      wallet,
      () => (isArchived ? unarchiveAccountAction(businessId, wallet.id) : archiveAccountAction(businessId, wallet.id)),
      () => {
        toast.success(t(isArchived ? "Wallet activated" : "Wallet archived"));
        if (isArchived && archived.length === 1) setTab("active");
      },
      isArchived ? "Failed to activate wallet" : "Failed to archive wallet",
    );
  }

  // Deletes a wallet nothing was ever posted to; one with history is
  // archived instead, so the books stay whole (the API decides which). On an
  // archived wallet that can only mean deleting it for good.
  async function remove(wallet: Account) {
    const isArchived = wallet.status === "ARCHIVED";
    const confirmed = await confirm(
      isArchived
        ? {
            title: t("Delete {name} for good?", { name: wallet.name }),
            message: t("Only a wallet nothing was ever posted to can be deleted. One with transactions stays archived, so your history stays whole."),
            confirmLabel: "Delete wallet",
          }
        : {
            title: t("Remove {name}?", { name: wallet.name }),
            message: t("A wallet with transactions is archived instead of deleted, so your history stays whole."),
            confirmLabel: "Remove wallet",
          },
    );
    if (!confirmed) return;
    act(
      wallet,
      () => removeAccountAction(businessId, wallet.id),
      (result) => {
        if (result.data?.deleted) {
          toast.success(t("Wallet deleted"));
          if (isArchived && archived.length === 1) setTab("active");
        } else if (isArchived) {
          // The API kept it: it has history. Say so instead of "archived".
          toast.info(t("This wallet has transactions, so it stays archived to keep your history."));
        } else {
          toast.success(t("Wallet archived"));
        }
      },
      "Failed to remove wallet",
    );
  }

  // A manager moves money right here; a viewer, who can't, gets the history.
  const moveButton = (size: "md" | "lg", className?: string) =>
    canManage ? (
      <Button variant="secondary" size={size} onClick={() => setMoving(true)} className={className}>
        <ArrowLeftRight className="text-ink-2" />
        {t("Move money")}
      </Button>
    ) : (
      <Button variant="secondary" size={size} asChild className={className}>
        <Link href="/balance/transfer">
          <ArrowLeftRight className="text-ink-2" />
          {t("Transfer history")}
        </Link>
      </Button>
    );

  return (
    <PageFrame className="md:gap-6">
      <PageHeader
        eyebrow={
          <>
            {t("Money")}
            {/* The phone board points the way; the desktop one separates. */}
            <span className="md:hidden"> › </span>
            <span className="hidden md:inline"> · </span>
            {t("Wallets")}
          </>
        }
        title={t("My wallets")}
        description={t("The cash, bank and mobile accounts that hold your money.")}
        hideDescriptionOnPhone
        actions={
          <>
            {moveButton("md")}
            {canManage && (
              <Button onClick={() => setDrawer("create")}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("Add wallet")}
              </Button>
            )}
          </>
        }
        hideActionsOnPhone
      />

      {/* Phone: the total, the share bar and the add button in one card. */}
      <Card padding="sm" elevated={false} className="flex flex-col gap-3 md:hidden">
        <span className="text-small leading-[normal] text-ink-muted">{t(active.length === 1 ? "Available across {count} wallet" : "Available across {count} wallets", { count: activeCount })}</span>
        <AmountText value={available} currency={currency} size="display" className="wrap-anywhere" />
        {archivedNote && <span className="-mt-2 text-caption text-ink-muted">{archivedNote}</span>}
        <WalletShareBar slices={walletShares(wallets)} size="sm" label={t("Share of balance by wallet")} />
        <div className="flex gap-3">
          {moveButton("lg", "flex-1")}
          {canManage && (
            <Button variant="soft" size="lg" onClick={() => setDrawer("create")} className="flex-1">
              <Plus strokeWidth={2.25} className="size-4" />
              {t("Add wallet")}
            </Button>
          )}
        </div>
      </Card>

      {/* Two cards a row until there's room for three, so a lakh figure is never cut short. */}
      <section className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-3">
        <Card className="flex min-w-0 flex-col gap-2">
          <span className="text-small font-medium text-ink-muted">{t("Available balance")}</span>
          <AmountText value={available} currency={currency} size="h2" className="text-h1 wrap-anywhere" />
          <span className="text-caption font-normal text-ink-muted">
            {t(active.length === 1 ? "Across {count} active wallet" : "Across {count} active wallets", { count: activeCount })}
            {archivedNote && ` · ${archivedNote}`}
          </span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-2">
          <span className="text-small font-medium text-ink-muted">{t("Opening balances")}</span>
          <AmountText value={totalOpening} currency={currency} size="h2" className="text-h1 wrap-anywhere" />
          <span className="text-caption font-normal text-ink-muted">{t("What the wallets held when you added them")}</span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-2 md:col-span-2 xl:col-span-1">
          <span className="text-small font-medium text-ink-muted">{t("Change since opening")}</span>
          <AmountText value={available - totalOpening} currency={currency} size="h2" tone="auto" signed className="text-h1 wrap-anywhere" />
          <span className="text-caption font-normal text-ink-muted">{t("Current balance minus opening balances")}</span>
        </Card>
      </section>

      <div className="flex flex-col gap-4">
        <TabBar
          options={[
            { value: "active", label: t("Active"), count: active.length },
            { value: "archived", label: t("Archived@@status"), count: archived.length },
          ]}
          value={current}
          onChange={setTab}
          label={t("Wallet status")}
          className={cn(archived.length === 0 && "max-md:hidden")}
        />
        <div className="grid gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
          {shown.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              index={wallets.indexOf(wallet)}
              currency={currency}
              canManage={canManage}
              busy={busy === wallet.id}
              onEdit={() => setDrawer(wallet)}
              onToggleArchive={() => toggleArchive(wallet)}
              onRemove={() => remove(wallet)}
            />
          ))}
          {current === "active" && canManage && (
            <button type="button" onClick={() => setDrawer("create")} className="hidden min-h-50 flex-col items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed border-line-strong bg-surface transition-colors hover:border-emerald md:flex">
              <span className="flex size-11 items-center justify-center rounded-full bg-mint-50 text-emerald">
                <Plus className="size-5" strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="text-title text-ink">{t("Add wallet")}</span>
              <span className="text-small text-ink-muted">{t("Cash, bank account or mobile wallet")}</span>
            </button>
          )}
          {shown.length === 0 && (current === "archived" || !canManage) && <p className="col-span-full py-6 text-center text-body text-ink-muted">{current === "archived" ? t("No archived wallet.") : t("No wallets yet.")}</p>}
        </div>
      </div>

      <WalletDrawer open={drawer !== "closed"} onClose={() => setDrawer("closed")} businessId={businessId} editing={editing} currency={currency} paletteIndex={editing ? wallets.indexOf(editing) : wallets.length} />
      <TransferDrawer open={moving} onClose={() => setMoving(false)} businessId={businessId} currency={currency} />
      {confirmDialog}
    </PageFrame>
  );
}
