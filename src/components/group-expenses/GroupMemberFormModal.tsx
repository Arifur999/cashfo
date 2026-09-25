"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createGroupMemberAction, updateGroupMemberAction } from "@/lib/groupExpensesActions";
import type { GroupMember } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface GroupMemberFormModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  editingMember: GroupMember | null;
}

export function GroupMemberFormModal({ open, onClose, businessId, editingMember }: GroupMemberFormModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingMember?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      setName(editingMember?.name ?? "");
      setPhone(editingMember?.phone ?? "");
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = editingMember
        ? await updateGroupMemberAction(businessId, editingMember.id, { name, phone: phone || undefined })
        : await createGroupMemberAction(businessId, { name, phone: phone || undefined });

      if (result.success) {
        toast.success(editingMember ? t("Member updated") : t("Member added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to save member"));
      }
    });
  }

  const isValid = name.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title={editingMember ? t("Edit Member") : t("Add Member")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder={t("e.g. Rahim")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Phone")} <span className="text-neutral-400">{t("(optional)")}</span>
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
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
          {editingMember ? t("Save Changes") : t("Add")}
        </button>
      </div>
    </Modal>
  );
}
