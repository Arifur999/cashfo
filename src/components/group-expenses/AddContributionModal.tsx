"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createGroupContributionAction, updateGroupContributionAction } from "@/lib/groupExpensesActions";
import type { GroupContribution, GroupMember } from "@/lib/api";
import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AddContributionModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  members: GroupMember[];
  editingContribution?: GroupContribution | null;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AddContributionModal({ open, onClose, businessId, members, editingContribution = null }: AddContributionModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const activeMembers = members.filter((m) => m.status === "ACTIVE");
  // If editing a contribution whose member has since been archived, that
  // member still needs to appear as a selectable option (same "legacy value
  // stays selectable while editing" pattern as ContactFormModal's BOTH type).
  const memberOptions =
    editingContribution && !activeMembers.some((m) => m.id === editingContribution.groupMemberId)
      ? [editingContribution.groupMember, ...activeMembers]
      : activeMembers;

  const [groupMemberId, setGroupMemberId] = useState(activeMembers[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingContribution?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      if (editingContribution) {
        setGroupMemberId(editingContribution.groupMemberId);
        setAmount(editingContribution.amount);
        setDate(editingContribution.date.slice(0, 10));
        setNote(editingContribution.note ?? "");
      } else {
        setGroupMemberId(activeMembers[0]?.id ?? "");
        setAmount("");
        setDate(today());
        setNote("");
      }
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = editingContribution
        ? await updateGroupContributionAction(businessId, editingContribution.id, { groupMemberId, amount, date, note: note || undefined })
        : await createGroupContributionAction(businessId, { groupMemberId, amount, date, note: note || undefined });
      if (result.success) {
        toast.success(editingContribution ? t("Contribution updated") : t("Contribution added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? (editingContribution ? t("Failed to update contribution") : t("Failed to add contribution")));
      }
    });
  }

  const isValid = groupMemberId.length > 0 && Number(amount) > 0 && date.length > 0;

  return (
    <Modal open={open} onClose={onClose} title={editingContribution ? t("Edit Contribution") : t("Add Contribution")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Date")}</label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Member")}</label>
          <select
            value={groupMemberId}
            onChange={(e) => setGroupMemberId(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            {memberOptions.length === 0 && <option value="">{t("Add a member first")}</option>}
            {memberOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Amount")}</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step="0.01"
            min={0}
            placeholder="0.00"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Note")} <span className="text-neutral-400">{t("(optional)")}</span>
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
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
          {editingContribution ? t("Save Changes") : t("Add")}
        </button>
      </div>
    </Modal>
  );
}
