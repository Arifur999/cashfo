"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createGroupExpenseAction, updateGroupExpenseAction } from "@/lib/groupExpensesActions";
import type { GroupExpense, GroupExpenseCategoryOption, GroupMember } from "@/lib/api";
import { DatePicker } from "@/components/ui/DatePicker";
import { Modal } from "@/components/ui/Modal";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  members: GroupMember[];
  categories: GroupExpenseCategoryOption[];
  editingExpense?: GroupExpense | null;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AddExpenseModal({ open, onClose, businessId, members, categories, editingExpense = null }: AddExpenseModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const activeMembers = members.filter((m) => m.status === "ACTIVE");
  // Same "keep a legacy value selectable while editing" pattern as
  // AddContributionModal's member dropdown.
  const paidByOptions =
    editingExpense?.paidByMember && !activeMembers.some((m) => m.id === editingExpense.paidByMember!.id)
      ? [editingExpense.paidByMember, ...activeMembers]
      : activeMembers;
  // Category is free text (see GroupExpense.category's schema comment) --
  // this is only "keep the current value selectable" for an expense whose
  // category was since renamed/deleted, same reasoning as paidByOptions above.
  const categoryOptions = editingExpense && !categories.some((c) => c.name === editingExpense.category) ? [editingExpense.category] : [];

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [paidByMemberId, setPaidByMemberId] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevKey, setPrevKey] = useState<string>("closed");
  const key = open ? (editingExpense?.id ?? "create") : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open) {
      if (editingExpense) {
        setAmount(editingExpense.amount);
        setDate(editingExpense.date.slice(0, 10));
        setCategory(editingExpense.category);
        setDescription(editingExpense.description ?? "");
        setPaidByMemberId(editingExpense.paidByMemberId ?? "");
      } else {
        setAmount("");
        setDate(today());
        setCategory(categories[0]?.name ?? "Other");
        setDescription("");
        setPaidByMemberId("");
      }
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = editingExpense
        ? await updateGroupExpenseAction(businessId, editingExpense.id, {
            amount,
            date,
            category,
            description: description || undefined,
            paidByMemberId,
          })
        : await createGroupExpenseAction(businessId, {
            amount,
            date,
            category,
            description: description || undefined,
            paidByMemberId: paidByMemberId || undefined,
          });
      if (result.success) {
        toast.success(editingExpense ? t("Expense updated") : t("Expense added"));
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? (editingExpense ? t("Failed to update expense") : t("Failed to add expense")));
      }
    });
  }

  const isValid = Number(amount) > 0 && date.length > 0;

  return (
    <Modal open={open} onClose={onClose} title={editingExpense ? t("Edit Expense") : t("Add Expense")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Date")}</label>
          <DatePicker value={date} onChange={setDate} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Category")}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            {categoryOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
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
            {t("Paid by")} <span className="text-neutral-400">{t("(optional)")}</span>
          </label>
          <select
            value={paidByMemberId}
            onChange={(e) => setPaidByMemberId(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            <option value="">{t("Not tracked")}</option>
            {paidByOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-neutral-400">{t("Informational only -- the expense is still split equally among all members.")}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Description")} <span className="text-neutral-400">{t("(optional)")}</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("e.g. Weekly bazar")}
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
          {editingExpense ? t("Save Changes") : t("Add")}
        </button>
      </div>
    </Modal>
  );
}
