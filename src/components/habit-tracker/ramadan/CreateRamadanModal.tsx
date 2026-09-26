"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { createRamadanTrackerAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface CreateRamadanModalProps {
  open: boolean;
  onClose: () => void;
}

// Type a year, pick 29 or 30 days -- the whole Ramadan sheet is created and
// opened straight away.
export function CreateRamadanModal({ open, onClose }: CreateRamadanModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [days, setDays] = useState<29 | 30>(30);
  const [isPending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setYear(String(new Date().getFullYear()));
      setDays(30);
    }
  }

  const isValid = /^\d{4}$/.test(year) && Number(year) >= 2000 && Number(year) <= 2100;

  function handleSubmit() {
    startTransition(async () => {
      const result = await createRamadanTrackerAction({ year: Number(year), days });
      if (result.success && result.data) {
        toast.success(t("Ramadan created"));
        onClose();
        router.push(`/habit-tracker/habits/ramadan/${result.data.id}`);
      } else {
        toast.error(result.message ?? t("Failed to create Ramadan"));
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Create Ramadan")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Year")}</label>
          <input
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder="2026"
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Number of days")}</label>
          <div className="grid grid-cols-2 gap-2">
            {([29, 30] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  days === option ? "border-amber-400 bg-amber-100 text-amber-900" : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-neutral-400">{t("Ramadan is 29 or 30 days, depending on the moon sighting.")}</p>
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
