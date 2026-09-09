"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import type { AccountTemplate, AccountType, WorkspaceType } from "@/lib/api";
import type { AccountTemplateFormInput } from "@/app/admin/(dashboard)/content/_actions";
import { t } from "@/lib/i18n/t";

const ACCOUNT_TYPES: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

interface AccountTemplateFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: AccountTemplate | null;
  isSubmitting: boolean;
  onSubmit: (values: AccountTemplateFormInput) => void;
  onDeactivate?: (template: AccountTemplate) => void;
}

export function AccountTemplateFormModal({ open, onClose, editing, isSubmitting, onSubmit, onDeactivate }: AccountTemplateFormModalProps) {
  const [name, setName] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("EXPENSE");
  const [appliesTo, setAppliesTo] = useState<WorkspaceType[]>(["PERSONAL", "BUSINESS"]);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setNameBn(editing?.nameBn ?? "");
    setAccountType(editing?.accountType ?? "EXPENSE");
    setAppliesTo(editing?.appliesTo ?? ["PERSONAL", "BUSINESS"]);
  }, [open, editing]);

  function toggleWorkspace(w: WorkspaceType) {
    setAppliesTo((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));
  }

  const isValid = name.trim().length > 0 && nameBn.trim().length > 0 && appliesTo.length > 0;

  return (
    <Modal open={open} onClose={onClose} title={editing ? t("Edit Account Template") : t("New Account Template")}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Name (English)")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Name (Bangla)")}</label>
            <input
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Account Type")}</label>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as AccountType)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-neutral-700">{t("Applies To")}</p>
          <div className="flex gap-2">
            {(["PERSONAL", "BUSINESS"] as WorkspaceType[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => toggleWorkspace(w)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  appliesTo.includes(w) ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-neutral-200 text-neutral-500"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        {editing && editing.isActive && onDeactivate ? (
          <button
            type="button"
            onClick={() => onDeactivate(editing)}
            className="rounded-xl px-4 py-2 text-sm font-medium text-brand-danger hover:bg-red-50"
          >
            {t("Deactivate")}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            {t("Cancel")}
          </button>
          <button
            type="button"
            disabled={!isValid || isSubmitting}
            onClick={() => onSubmit({ name, nameBn, accountType, appliesTo })}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? t("Save Changes") : t("Create")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
