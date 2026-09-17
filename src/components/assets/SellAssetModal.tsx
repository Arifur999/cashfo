"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import type { Account, Asset } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { sellAssetAction } from "@/lib/assetActions";
import { formatCurrency } from "@/lib/currency";
import { getMoneyAccountsAction } from "@/lib/quickEntryActions";
import { getActiveSavingsWalletsAction } from "@/lib/savingsGoalActions";

interface SellAssetModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  asset: Asset | null;
  currency: string;
}

// Mirrors PurchaseAssetModal's account picker (one <select> combining money
// accounts + savings wallets into two <optgroup>s), reversed: money comes IN
// from selling the asset rather than going out to buy it. Prefills Sold
// Price with the asset's current tracked value -- a sensible default, still
// editable in case the actual sale price differs.
export function SellAssetModal({ open, onClose, businessId, asset, currency }: SellAssetModalProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [soldPrice, setSoldPrice] = useState("");
  const [soldAccountId, setSoldAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [moneyAccounts, setMoneyAccounts] = useState<Account[]>([]);
  const [savingsWallets, setSavingsWallets] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState(`${open}:${asset?.id ?? ""}`);
  const key = `${open}:${asset?.id ?? ""}`;
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setSoldPrice(asset?.currentValue ?? "");
      setSoldAccountId("");
      setDate(new Date().toISOString().slice(0, 10));
      setNotes("");
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    Promise.all([getMoneyAccountsAction(businessId), getActiveSavingsWalletsAction(businessId)]).then(([accounts, wallets]) => {
      setMoneyAccounts(accounts);
      setSavingsWallets(wallets);
      setSoldAccountId((current) => current || accounts[0]?.id || wallets[0]?.id || "");
      setLoading(false);
    });
  }, [open, businessId]);

  const soldPriceNumber = Number(soldPrice);
  const isValid = soldPrice.trim().length > 0 && soldPriceNumber > 0 && soldAccountId.length > 0;

  function handleSubmit() {
    if (!asset || !isValid) return;
    startTransition(async () => {
      const result = await sellAssetAction(businessId, asset.id, {
        soldPrice: soldPriceNumber,
        soldAccountId,
        date,
        notes: notes.trim() || undefined,
      });
      if (result.success) {
        toast.success(t("Asset sold -- recorded as income"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to record sale"));
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Sell Asset")}>
      <div className="space-y-4">
        {asset && (
          <p className="rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            {t('Selling "')}
            <span className="font-semibold text-neutral-900">{asset.name}</span>
            {t('" (current value: {value}).').replace("{value}", formatCurrency(asset.currentValue, currency))}
          </p>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Sold Price")}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={soldPrice}
            onChange={(e) => setSoldPrice(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Deposit To")}</label>
          <select
            value={soldAccountId}
            onChange={(e) => setSoldAccountId(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
          >
            {moneyAccounts.length === 0 && savingsWallets.length === 0 && <option value="">{t("No accounts yet")}</option>}
            {moneyAccounts.length > 0 && (
              <optgroup label={t("General Accounts")}>
                {moneyAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            )}
            {savingsWallets.length > 0 && (
              <optgroup label={t("Savings Accounts")}>
                {savingsWallets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Date")}</label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Notes")} <span className="text-neutral-400">({t("Optional")})</span>
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={!isValid || isPending}
        onClick={handleSubmit}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("Sell Asset")}
      </button>
    </Modal>
  );
}
