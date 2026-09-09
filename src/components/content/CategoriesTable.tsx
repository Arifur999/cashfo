"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createCategoryAction } from "@/app/admin/(dashboard)/content/_actions";
import type { CategoryDirection, DefaultCategory } from "@/lib/api";
import { t } from "@/lib/i18n/t";
import { Modal } from "@/components/ui/Modal";

function Section({ title, categories }: { title: string; categories: DefaultCategory[] }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-black/5">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900">{title}</h3>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-400">
          <tr>
            <th className="py-2 font-medium">{t("Icon")}</th>
            <th className="py-2 font-medium">{t("Name")}</th>
            <th className="py-2 font-medium">{t("Linked Account")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {categories.map((cat) => (
            <tr key={cat.id}>
              <td className="py-2 text-neutral-400">{cat.icon ?? "—"}</td>
              <td className="py-2 text-neutral-800">
                {cat.name} <span className="text-neutral-400">/ {cat.nameBn}</span>
              </td>
              <td className="py-2 text-neutral-500">{cat.linkedAccountTemplate?.name ?? "—"}</td>
            </tr>
          ))}
          {categories.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-neutral-400">
                {t("None yet.")}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function CategoriesTable({ categories, canManage }: { categories: DefaultCategory[]; canManage: boolean }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameBn, setNameBn] = useState("");
  const [type, setType] = useState<CategoryDirection>("EXPENSE");
  const [icon, setIcon] = useState("");
  const [isPending, startTransition] = useTransition();

  const income = categories.filter((c) => c.type === "INCOME");
  const expense = categories.filter((c) => c.type === "EXPENSE");

  function handleCreate() {
    startTransition(async () => {
      const result = await createCategoryAction({ name, nameBn, type, icon: icon || undefined });
      if (result.success) {
        toast.success(t("Category created"));
        setIsModalOpen(false);
        setName("");
        setNameBn("");
        setIcon("");
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to create category"));
      }
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover"
        >
          <Plus className="h-4 w-4" /> {t("New Category")}
        </button>
      </div>
      )}
      <Section title={t("Income")} categories={income} />
      <Section title={t("Expense")} categories={expense} />

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={t("New Category")}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("Name (English)")}
              className="rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
            <input
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              placeholder={t("Name (Bangla)")}
              className="rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CategoryDirection)}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            <option value="EXPENSE">EXPENSE</option>
            <option value="INCOME">INCOME</option>
          </select>
          <input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder={t("Icon identifier (e.g. utensils)")}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
            {t("Cancel")}
          </button>
          <button
            type="button"
            disabled={!name || !nameBn || isPending}
            onClick={handleCreate}
            className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-primary-hover disabled:opacity-50"
          >
            {t("Create")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
