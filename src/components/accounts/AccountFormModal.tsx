"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createAccountAction, updateAccountAction } from "@/lib/accountActions";
import type { Account, AccountType, LanguagePreference } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const ACCOUNT_TYPES: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

interface AccountFormModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editingAccount: Account | null;
  allAccounts: Account[];
  preferredLanguage: LanguagePreference;
}

export function AccountFormModal({ open, onClose, businessId, editingAccount, allAccounts }: AccountFormModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("ASSET");
  const [accountSubtype, setAccountSubtype] = useState("");
  const [parentId, setParentId] = useState("");
  const [isPending, startTransition] = useTransition();

  // Reset/populate the instant the modal transitions closed -> open (React's
  // documented render-time state-adjustment pattern, not a useEffect).
  const [prevKey, setPrevKey] = useState<string>(`closed`);
  const key = open ? (editingAccount?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      if (editingAccount) {
        setName(editingAccount.name);
        setNameBn(editingAccount.nameBn ?? "");
        setAccountType(editingAccount.accountType);
        setAccountSubtype(editingAccount.accountSubtype ?? "");
        setParentId(editingAccount.parentId ?? "");
      } else {
        setName("");
        setNameBn("");
        setAccountType("ASSET");
        setAccountSubtype("");
        setParentId("");
      }
    }
  }

  const parentOptions = allAccounts.filter((a) => a.accountType === accountType && a.id !== editingAccount?.id);

  function handleSubmit() {
    startTransition(async () => {
      const input = {
        name,
        nameBn: nameBn || undefined,
        accountType,
        accountSubtype: accountSubtype || undefined,
        parentId: parentId || undefined,
      };
      const result = editingAccount
        ? await updateAccountAction(businessId, editingAccount.id, input)
        : await createAccountAction(businessId, input);

      if (result.success) {
        toast.success(editingAccount ? t("Account updated") : t("Account created"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? (editingAccount ? t("Failed to update account") : t("Failed to create account")));
      }
    });
  }

  const isValid = name.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title={editingAccount ? t("Edit Account") : t("Add Account")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("e.g. Petty Cash")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Bangla Name")} <span className="text-neutral-400">{t("(optional)")}</span>
          </label>
          <input
            value={nameBn}
            onChange={(e) => setNameBn(e.target.value)}
            placeholder="যেমন খুচরা নগদ"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Account Type")}</label>
            <select
              value={accountType}
              onChange={(e) => {
                setAccountType(e.target.value as AccountType);
                setParentId("");
              }}
              disabled={!!editingAccount}
              title={editingAccount ? t("Account type can't be changed after creation") : undefined}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary disabled:bg-neutral-50 disabled:text-neutral-400"
            >
              {/* Renders the raw enum code itself (e.g. "ASSET"), not a
                  translated label -- intentionally left untranslated (see
                  translation guidelines: a literal enum/status CODE value
                  stays as-is). Loop variable named `at` (Account Type), not
                  `t`, so it can never shadow the translate function above. */}
              {ACCOUNT_TYPES.map((at) => (
                <option key={at} value={at}>
                  {at}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Subtype")}</label>
            <input
              value={accountSubtype}
              onChange={(e) => setAccountSubtype(e.target.value)}
              placeholder={t("e.g. bank")}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Parent Account")} <span className="text-neutral-400">{t("(optional)")}</span>
          </label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            <option value="">{t("None (top-level)")}</option>
            {parentOptions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {editingAccount ? t("Save Changes") : t("Create")}
        </button>
      </div>
    </Modal>
  );
}
