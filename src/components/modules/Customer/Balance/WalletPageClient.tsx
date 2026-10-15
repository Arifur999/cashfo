"use client";

import { ArrowLeftRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { walletShares } from "@/lib/customer/walletShares";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
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

// My wallets: what they hold altogether, then one card per wallet with its
// actions, and a dashed card to add the next one. Archived wallets wait on
// their own tab.
export function WalletPageClient({ businessId, wallets, canManage, currency }: WalletPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [tab, setTab] = useState<Tab>("active");
  const [drawer, setDrawer] = useState<"closed" | "create" | Account>("closed");
  const [, startTransition] = useTransition();

  const active = wallets.filter((wallet) => wallet.status !== "ARCHIVED");
  const archived = wallets.filter((wallet) => wallet.status === "ARCHIVED");
  const shown = tab === "active" ? active : archived;
  const totalBalance = active.reduce((sum, wallet) => sum + Number(wallet.currentBalance), 0);
  const totalOpening = active.reduce((sum, wallet) => sum + Number(wallet.openingBalance), 0);
  const editing = typeof drawer === "object" ? drawer : null;

  function run(action: () => Promise<ActionResult<unknown>>, done: string, failed: string) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(t(done));
        router.refresh();
      } else {
        toast.error(result.message ?? t(failed));
      }
    });
  }

  function toggleArchive(wallet: Account) {
    const isArchived = wallet.status === "ARCHIVED";
    run(() => (isArchived ? unarchiveAccountAction(businessId, wallet.id) : archiveAccountAction(businessId, wallet.id)), isArchived ? "Wallet activated" : "Wallet archived", isArchived ? "Failed to activate wallet" : "Failed to archive wallet");
  }

  // Deletes a wallet nothing was ever posted to; one with history is
  // archived instead, so the books stay whole (the API decides which).
  async function remove(wallet: Account) {
    if (!(await confirm({ title: `${t("Remove")} ${wallet.name}?`, message: t("A wallet with transactions is archived instead of deleted, so your history stays whole."), confirmLabel: "Remove wallet" }))) return;
    startTransition(async () => {
      const result = await removeAccountAction(businessId, wallet.id);
      if (result.success) {
        toast.success(result.data?.deleted ? t("Wallet deleted") : t("Wallet archived"));
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to remove wallet"));
      }
    });
  }

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={`${t("Money")} · ${t("Wallets")}`}
        title={
          <>
            <span className="md:hidden">{t("My wallets")}</span>
            <span className="hidden md:inline">{t("Wallets")}</span>
          </>
        }
        description={<span className="hidden md:inline">{t("The cash, bank and mobile accounts that hold your money.")}</span>}
        actions={
          <div className="hidden items-center gap-3 md:flex">
            <Button variant="secondary" asChild>
              <Link href="/balance/transfer">
                <ArrowLeftRight className="text-ink-2" />
                {t("Move money")}
              </Link>
            </Button>
            {canManage && (
              <Button onClick={() => setDrawer("create")}>
                <Plus strokeWidth={2.5} className="size-4" />
                {t("Add wallet")}
              </Button>
            )}
          </div>
        }
        className="max-md:gap-0"
      />

      {/* Phone: the total, the share bar and the add button in one card. */}
      <Card padding="sm" className="flex flex-col gap-3 md:hidden">
        <span className="text-small text-ink-muted">
          {t("Available across")} {active.length} {t("wallets")}
        </span>
        <AmountText value={totalBalance} currency={currency} size="display" />
        <WalletShareBar slices={walletShares(wallets)} size="sm" label={t("Share of balance by wallet")} />
        {canManage && (
          <Button variant="secondary" size="lg" onClick={() => setDrawer("create")}>
            <Plus strokeWidth={2.25} className="size-4" />
            {t("Add wallet")}
          </Button>
        )}
      </Card>

      <section className="hidden gap-4 md:grid md:grid-cols-3">
        <Card className="flex flex-col gap-2">
          <span className="text-small font-medium text-ink-muted">{t("Total balance")}</span>
          <AmountText value={totalBalance} currency={currency} size="h2" className="text-h1" />
          <span className="text-caption font-normal text-ink-muted">
            {t("Across")} {active.length} {t("active wallets")}
          </span>
        </Card>
        <Card className="flex flex-col gap-2">
          <span className="text-small font-medium text-ink-muted">{t("Opening balances")}</span>
          <AmountText value={totalOpening} currency={currency} size="h2" className="text-h1" />
          <span className="text-caption font-normal text-ink-muted">{t("What the wallets held when you added them")}</span>
        </Card>
        <Card className="flex flex-col gap-2">
          <span className="text-small font-medium text-ink-muted">{t("Change since opening")}</span>
          <AmountText value={totalBalance - totalOpening} currency={currency} size="h2" tone="auto" signed className="text-h1" />
          <span className="text-caption font-normal text-ink-muted">{t("Current balance minus opening balances")}</span>
        </Card>
      </section>

      <div className="flex flex-col gap-4">
        <TabBar
          options={[
            { value: "active", label: t("Active"), count: active.length },
            { value: "archived", label: t("Archived"), count: archived.length },
          ]}
          value={tab}
          onChange={setTab}
          label={t("Wallet status")}
          className={cn(archived.length === 0 && "max-md:hidden")}
        />
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          {shown.map((wallet) => (
            <WalletCard key={wallet.id} wallet={wallet} index={wallets.indexOf(wallet)} currency={currency} canManage={canManage} onEdit={() => setDrawer(wallet)} onToggleArchive={() => toggleArchive(wallet)} onRemove={() => remove(wallet)} />
          ))}
          {tab === "active" && canManage && (
            <button type="button" onClick={() => setDrawer("create")} className="hidden h-50 flex-col items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed border-line-strong bg-surface transition-colors hover:border-emerald md:flex">
              <span className="flex size-11 items-center justify-center rounded-full bg-mint-50 text-emerald">
                <Plus className="size-5" strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="text-title text-ink">{t("Add wallet")}</span>
              <span className="text-small text-ink-muted">{t("Cash, bank account or mobile wallet")}</span>
            </button>
          )}
          {shown.length === 0 && (tab === "archived" || !canManage) && <p className="py-6 text-center text-body text-ink-muted md:col-span-3">{tab === "archived" ? t("No archived wallet.") : t("No wallets yet.")}</p>}
        </div>
      </div>

      <WalletDrawer open={drawer !== "closed"} onClose={() => setDrawer("closed")} businessId={businessId} editing={editing} currency={currency} paletteIndex={editing ? wallets.indexOf(editing) : wallets.length} />
      {confirmDialog}
    </PageFrame>
  );
}
