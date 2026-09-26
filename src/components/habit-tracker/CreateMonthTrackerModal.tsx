"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { createHabitTrackerAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface CreateMonthTrackerModalProps {
  open: boolean;
  onClose: () => void;
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

// Pick a month, type a year, and that month's Namaz sheet is created and
// opened (same Month-select + free-typed Year shape as AddMonthBudgetModal).
export function CreateMonthTrackerModal({ open, onClose }: CreateMonthTrackerModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [isPending, startTransition] = useTransition();
  const monthId = useId();
  const yearId = useId();

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMonth(new Date().getMonth() + 1);
      setYear(String(new Date().getFullYear()));
    }
  }

  const isValid = /^\d{4}$/.test(year) && Number(year) >= 2000 && Number(year) <= 2100;

  // Once a create is in flight it will finish and open the new sheet, so the
  // dialog can no longer be dismissed (Cancel / Escape / backdrop).
  function handleClose() {
    if (!isPending) onClose();
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createHabitTrackerAction({ category: "Namaz", month, year: Number(year) });
      if (result.success) {
        toast.success(t("Month created"));
        onClose();
        if (result.data) router.push(`/habit-tracker/habits/namaz/${result.data.id}`);
        else router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to create month tracker"));
      }
    });
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("Create Month")}>
      <div className="space-y-4">
        <div>
          <label htmlFor={monthId} className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Month")}
          </label>
          <select
            id={monthId}
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
          <label htmlFor={yearId} className="mb-1 block text-sm font-medium text-neutral-700">
            {t("Year")}
          </label>
          <input
            id={yearId}
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="2026"
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button type="button" disabled={isPending} onClick={handleClose} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50">
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
