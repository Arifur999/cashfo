"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import type { Account, AssetCategoryOption } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getAssetCategoriesAction, purchaseAssetAction } from "@/lib/assetActions";
import { getMoneyAccountsAction } from "@/lib/quickEntryActions";
import { getActiveSavingsWalletsAction } from "@/lib/savingsGoalActions";

interface PurchaseAssetModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  currency: string;
}

// Records a new Asset purchase. The "Account" dropdown combines the two
// existing account-picker data sources (general money accounts + savings
// wallets) into one <select> with two <optgroup>s, same underlying accounts
// a regular expense/withdrawal can be paid from, since buying an asset is
// really just money leaving one of them.
export function PurchaseAssetModal({ open, onClose, businessId, currency }: PurchaseAssetModalProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseAccountId, setPurchaseAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [moneyAccounts, setMoneyAccounts] = useState<Account[]>([]);
  const [savingsWallets, setSavingsWallets] = useState<Account[]>([]);
  const [categories, setCategories] = useState<AssetCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName("");
      setCategory("");
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setPurchasePrice("");
      setPurchaseAccountId("");
      setNotes("");
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    Promise.all([getMoneyAccountsAction(businessId), getActiveSavingsWalletsAction(businessId), getAssetCategoriesAction(businessId)]).then(
      ([accounts, wallets, categoriesResult]) => {
        setMoneyAccounts(accounts);
        setSavingsWallets(wallets);
        setPurchaseAccountId((current) => current || accounts[0]?.id || wallets[0]?.id || "");
        const fetchedCategories = categoriesResult.data ?? [];
        setCategories(fetchedCategories);
        setCategory((current) => current || fetchedCategories.find((c) => c.name === "Other")?.name || fetchedCategories[0]?.name || "");
        setLoading(false);
      },
    );
  }, [open, businessId]);

  const currencySuffix = currency ? ` (${currency})` : "";

  function handleSubmit() {
    if (!name.trim()) {
      toast.error(t("Asset name is required"));
      return;
    }
    const priceValue = Number(purchasePrice);
    if (!purchasePrice || priceValue <= 0) {
      toast.error(t("Value must be greater than zero"));
      return;
    }
    if (!purchaseAccountId) {
      toast.error(t("Select an account to pay from"));
      return;
    }
    startTransition(async () => {
      const result = await purchaseAssetAction(businessId, {
        name: name.trim(),
        category,
        purchaseDate,
        purchasePrice: priceValue,
        purchaseAccountId,
        notes: notes.trim() || undefined,
      });
      if (result.success) {
        toast.success(t("Asset purchased"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to record purchase"));
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Purchase Asset")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Date")}</label>
          <DatePicker value={purchaseDate} onChange={setPurchaseDate} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Asset Name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g. Toyota Corolla, Family Land")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Category")}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50"
          >
            {categories.length === 0 && <option value="">{t("No categories yet")}</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Value")}
            {currencySuffix}
          </label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={purchasePrice}
            onChange={(e) => setPurchasePrice(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Account")}</label>
          <select
            value={purchaseAccountId}
            onChange={(e) => setPurchaseAccountId(e.target.value)}
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
          {!loading && moneyAccounts.length === 0 && savingsWallets.length === 0 && (
            <p className="mt-1 text-xs text-brand-danger">{t("No accounts exist in this workspace yet -- add one in Chart of Accounts first.")}</p>
          )}
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
        disabled={isPending}
        onClick={handleSubmit}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("Save Asset")}
      </button>
    </Modal>
  );
}
