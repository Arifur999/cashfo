"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { WalletCard } from "@/components/modules/Customer/Balance/WalletCard";
import { WalletDrawer } from "@/components/modules/Customer/Balance/WalletDrawer";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { archiveAccountAction, removeAccountAction, unarchiveAccountAction, type ActionResult } from "@/lib/customer/accountActions";
import type { Account } from "@/lib/customer/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface SavingsWalletPageClientProps {
  businessId: string;
  wallets: Account[];
  canManage: boolean;
  currency: string;
}

// Savings wallets: the DPS, FDR and other accounts saved money sits in --
// the same cards and drawer as My wallets, in the savings colours.
export function SavingsWalletPageClient({ businessId, wallets, canManage, currency }: SavingsWalletPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [drawer, setDrawer] = useState<"closed" | "create" | Account>("closed");
  const [, startTransition] = useTransition();
  const editing = typeof drawer === "object" ? drawer : null;
  const ordered = [...wallets].sort((a, b) => Number(a.status === "ARCHIVED") - Number(b.status === "ARCHIVED"));

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
        eyebrow={`${t("Money")} · ${t("Savings")}`}
        title={t("Savings wallets")}
        description={t("Where your saved money actually sits, for example a bank DPS or FDR account.")}
        actions={
          canManage && (
            <Button onClick={() => setDrawer("create")}>
              <Plus strokeWidth={2.5} className="size-4" />
              {t("Add savings wallet")}
            </Button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-3 md:gap-5">
        {ordered.map((wallet) => (
          <WalletCard key={wallet.id} wallet={wallet} index={wallets.indexOf(wallet)} currency={currency} canManage={canManage} savings onEdit={() => setDrawer(wallet)} onToggleArchive={() => toggleArchive(wallet)} onRemove={() => remove(wallet)} />
        ))}
        {canManage ? (
          <button type="button" onClick={() => setDrawer("create")} className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed border-line-strong bg-surface transition-colors hover:border-emerald md:h-50">
            <span className="flex size-11 items-center justify-center rounded-full bg-mint-50 text-emerald">
              <Plus className="size-5" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="text-title text-ink">{t("Add savings wallet")}</span>
            <span className="text-small text-ink-muted">{t("DPS, FDR or any account you save in")}</span>
          </button>
        ) : (
          wallets.length === 0 && <p className="py-6 text-center text-body text-ink-muted md:col-span-3">{t("No savings wallet yet.")}</p>
        )}
      </div>

      <WalletDrawer open={drawer !== "closed"} onClose={() => setDrawer("closed")} businessId={businessId} editing={editing} currency={currency} paletteIndex={editing ? wallets.indexOf(editing) : wallets.length} savings />
      {confirmDialog}
    </PageFrame>
  );
}
