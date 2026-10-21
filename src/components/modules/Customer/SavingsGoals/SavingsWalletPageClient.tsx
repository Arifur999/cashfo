"use client";

import { Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { WalletCard } from "@/components/modules/Customer/Balance/WalletCard";
import { WalletDrawer } from "@/components/modules/Customer/Balance/WalletDrawer";
import { useConfirmDialog } from "@/components/modules/Customer/Shared/useConfirmDialog";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { archiveAccountAction, removeAccountAction, unarchiveAccountAction, type ActionResult } from "@/lib/customer/accountActions";
import type { Account } from "@/lib/customer/api";
import { formatCurrency } from "@/lib/customer/currency";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface SavingsWalletPageClientProps {
  businessId: string;
  wallets: Account[];
  canManage: boolean;
  currency: string;
  // Arrived from an "Add savings wallet" link: start with the drawer open.
  openAdd?: boolean;
}

// Savings wallets: the DPS, FDR and other accounts saved money sits in --
// the same cards and drawer as My wallets, in the savings colours.
export function SavingsWalletPageClient({ businessId, wallets, canManage, currency, openAdd = false }: SavingsWalletPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [drawer, setDrawer] = useState<"closed" | "create" | Account>(openAdd && canManage ? "create" : "closed");
  const [, startTransition] = useTransition();
  const editing = typeof drawer === "object" ? drawer : null;
  const ordered = [...wallets].sort((a, b) => Number(a.status === "ARCHIVED") - Number(b.status === "ARCHIVED"));

  // ?add=1 has done its job once the drawer is open: drop it, so a refresh
  // or Back doesn't open the drawer again.
  useEffect(() => {
    if (openAdd) window.history.replaceState(null, "", pathname);
  }, [openAdd, pathname]);

  function run(action: () => Promise<ActionResult<unknown>>, done: string, failed: string) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(t(done));
        router.refresh();
      } else {
        toast.error(t(result.message ?? failed));
      }
    });
  }

  // This page lists active wallets only, so an archived one leaves it (and
  // the Add money and Withdraw pickers) until restored from Savings summary.
  // Money still in it is worth a second look first.
  const stillHolds = (wallet: Account) => (Number(wallet.currentBalance) !== 0 ? formatCurrency(wallet.currentBalance, currency) : null);

  async function toggleArchive(wallet: Account) {
    const isArchived = wallet.status === "ARCHIVED";
    const amount = stillHolds(wallet);
    if (!isArchived && amount) {
      const ok = await confirm({
        title: t("Archive {name}?", { name: wallet.name }),
        message: t("{name} still holds {amount}. Once archived it leaves this page, and Add money and Withdraw can't use it. You can restore it from Savings summary.", { name: wallet.name, amount }),
        confirmLabel: "Archive wallet",
      });
      if (!ok) return;
    }
    run(() => (isArchived ? unarchiveAccountAction(businessId, wallet.id) : archiveAccountAction(businessId, wallet.id)), isArchived ? "Wallet activated" : "Wallet archived", isArchived ? "Failed to activate wallet" : "Failed to archive wallet");
  }

  async function remove(wallet: Account) {
    const amount = stillHolds(wallet);
    const rule = t("A wallet with transactions is archived instead of deleted, so your history stays whole.");
    const message = amount ? `${t("{name} still holds {amount}. Removed or archived, it leaves this page, and Add money and Withdraw can't use it.", { name: wallet.name, amount })} ${rule}` : rule;
    if (!(await confirm({ title: t("Remove {name}?", { name: wallet.name }), message, confirmLabel: "Remove wallet" }))) return;
    startTransition(async () => {
      const result = await removeAccountAction(businessId, wallet.id);
      if (result.success) {
        toast.success(result.data?.deleted ? t("Wallet deleted") : t("Wallet archived"));
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to remove wallet"));
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
