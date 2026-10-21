"use client";

import { ArchiveRestore } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import { unarchiveAccountAction } from "@/lib/customer/accountActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface RestoreWalletButtonProps {
  businessId: string;
  walletId: string;
  walletName: string;
  // "inline": a small word in a Savings summary row; "button": the banner's
  // own action, with the wallet's name.
  appearance?: "inline" | "button";
  className?: string;
}

// Brings an archived savings wallet back. Savings wallets lists active ones
// only, so this is the way back for one archived by mistake: it returns to
// that page and to the Add money and Withdraw pickers.
export function RestoreWalletButton({ businessId, walletId, walletName, appearance = "inline", className }: RestoreWalletButtonProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function restore() {
    startTransition(async () => {
      const result = await unarchiveAccountAction(businessId, walletId);
      if (result.success) {
        toast.success(t("Wallet restored"));
        router.refresh();
      } else {
        toast.error(t(result.message ?? "Failed to restore wallet"));
      }
    });
  }

  if (appearance === "button") {
    return (
      <Button variant="action" size="lg" onClick={restore} disabled={isPending} className={cn("shrink-0", className)}>
        {isPending ? <Loader size={16} onDark label={t("Loading...")} /> : <ArchiveRestore aria-hidden="true" />}
        {t("Restore {name}", { name: walletName })}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={restore}
      disabled={isPending}
      aria-label={t("Restore {name}", { name: walletName })}
      className={cn("inline-flex h-7 items-center gap-1 rounded-md px-2 text-caption font-semibold text-emerald hover:bg-mint-50 disabled:opacity-60 pointer-coarse:h-11", className)}
    >
      {isPending ? <Loader size={12} label={t("Loading...")} /> : <ArchiveRestore className="size-3.5" aria-hidden="true" />}
      {t("Restore")}
    </button>
  );
}
