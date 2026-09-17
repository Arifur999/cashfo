"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { PasswordInput } from "@/components/ui/PasswordInput";
import type { VaultEntryCategory, VaultEntrySummary } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { createVaultEntryAction, updateVaultEntryAction } from "@/lib/passwordVaultActions";
import { VAULT_CATEGORY_LABELS } from "./vaultCategoryDisplay";

interface VaultEntryModalProps {
  open: boolean;
  onClose: () => void;
  vaultToken: string;
  editingEntry: VaultEntrySummary | null;
  onSaved: () => void;
}

// Create/edit form for one vault entry. Editing never prefills the actual
// password (the list response never carries it, see VaultEntrySummary's
// comment) -- leaving the Password field blank on an edit keeps the stored
// one unchanged; typing a new value replaces it.
export function VaultEntryModal({ open, onClose, vaultToken, editingEntry, onSaved }: VaultEntryModalProps) {
  const { t } = useLocale();
  const [prevEntryId, setPrevEntryId] = useState(editingEntry?.id ?? null);
  const [title, setTitle] = useState(editingEntry?.title ?? "");
  const [category, setCategory] = useState<VaultEntryCategory>(editingEntry?.category ?? "OTHER");
  const [websiteUrl, setWebsiteUrl] = useState(editingEntry?.websiteUrl ?? "");
  const [holderName, setHolderName] = useState(editingEntry?.holderName ?? "");
  const [usernameOrEmail, setUsernameOrEmail] = useState(editingEntry?.usernameOrEmail ?? "");
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState(editingEntry?.notes ?? "");
  const [isPending, startTransition] = useTransition();

  const currentEntryId = editingEntry?.id ?? null;
  if (currentEntryId !== prevEntryId) {
    setPrevEntryId(currentEntryId);
    setTitle(editingEntry?.title ?? "");
    setCategory(editingEntry?.category ?? "OTHER");
    setWebsiteUrl(editingEntry?.websiteUrl ?? "");
    setHolderName(editingEntry?.holderName ?? "");
    setUsernameOrEmail(editingEntry?.usernameOrEmail ?? "");
    setPassword("");
    setNotes(editingEntry?.notes ?? "");
  }

  function handleSave() {
    if (!title.trim()) {
      toast.error(t("Title is required"));
      return;
    }
    if (!editingEntry && !password) {
      toast.error(t("Password is required"));
      return;
    }
    startTransition(async () => {
      const input = {
        title: title.trim(),
        category,
        websiteUrl: websiteUrl.trim() || undefined,
        holderName: holderName.trim() || undefined,
        usernameOrEmail: usernameOrEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        ...(password ? { password } : {}),
      };
      const result = editingEntry ? await updateVaultEntryAction(vaultToken, editingEntry.id, input) : await createVaultEntryAction(vaultToken, input);
      if (result.success) {
        toast.success(editingEntry ? t("Entry updated") : t("Entry saved"));
        onSaved();
        onClose();
      } else {
        toast.error(result.message ?? t("Failed to save entry"));
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={editingEntry ? t("Edit Entry") : t("Add Entry")}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Title")}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("e.g. Facebook, Dutch Bangla Bank")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Category")}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as VaultEntryCategory)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          >
            {(Object.keys(VAULT_CATEGORY_LABELS) as VaultEntryCategory[]).map((key) => (
              <option key={key} value={key}>
                {t(VAULT_CATEGORY_LABELS[key])}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Name")}</label>
          <input
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            placeholder={t("Account holder's name")}
            name="vault-entry-holder-name"
            autoComplete="off"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Username / Email")}</label>
          <input
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            name="vault-entry-login-id"
            autoComplete="off"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Password")} {editingEntry && <span className="font-normal text-neutral-400">{t("(leave blank to keep unchanged)")}</span>}
          </label>
          <PasswordInput value={password} onChange={setPassword} name="vault-entry-secret" autoComplete="new-password" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Website URL")}</label>
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Notes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          {t("Cancel")}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("Save")}
        </button>
      </div>
    </Modal>
  );
}
