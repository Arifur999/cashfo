"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { createHabitTrackerAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface CreateMonthTrackerModalProps {
  open: boolean;
  onClose: () => void;
  category: string;
  // Called with the new sheet's id so the page can open it straight away.
  onCreated?: (id: string) => void;
}

export const TRACKER_MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Pick a month, type a year, and the whole month's sheet is created (same
// Month-select + free-typed Year shape as AddMonthBudgetModal).
export function CreateMonthTrackerModal({ open, onClose, category, onCreated }: CreateMonthTrackerModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [isPending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMonth(new Date().getMonth() + 1);
      setYear(String(new Date().getFullYear()));
    }
  }

  const isValid = /^\d{4}$/.test(year) && Number(year) >= 2000 && Number(year) <= 2100;

  function handleSubmit() {
    startTransition(async () => {
      const result = await createHabitTrackerAction({ category, month, year: Number(year) });
      if (result.success) {
        toast.success(t("Month created"));
        if (result.data) onCreated?.(result.data.id);
        onClose();
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to create month tracker"));
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Create Month")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Month")}</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            {TRACKER_MONTH_LABELS.map((label, i) => (
              <option key={label} value={i + 1}>
                {t(label)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Year")}</label>
          <input
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="2026"
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
          {t("Create")}
        </button>
      </div>
    </Modal>
  );
}
