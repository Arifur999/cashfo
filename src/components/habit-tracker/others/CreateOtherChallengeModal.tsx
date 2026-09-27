"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { createCustomTrackerAction } from "@/lib/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { CHALLENGE_DURATIONS } from "./challengeDurations";

interface CreateOtherChallengeModalProps {
  open: boolean;
  onClose: () => void;
}

// Type a name and a day-count goal (a duration from the dropdown, or a custom
// number of days) -- the sheet is created and opened straight away. Unlike
// Ramadan, any number of these can exist at once, even under the same name.
export function CreateOtherChallengeModal({ open, onClose }: CreateOtherChallengeModalProps) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<number | "custom">(30);
  const [customDays, setCustomDays] = useState("");
  const [isPending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setPreset(30);
      setCustomDays("");
    }
  }

  const totalDays = preset === "custom" ? Number(customDays) : preset;
  const isValid = name.trim().length > 0 && name.trim().length <= 60 && Number.isInteger(totalDays) && totalDays >= 1 && totalDays <= 365;

  function handleSubmit() {
    if (!isValid) return;
    startTransition(async () => {
      const result = await createCustomTrackerAction({ name: name.trim(), totalDays });
      if (result.success && result.data) {
        toast.success(t("Challenge created"));
        onClose();
        router.push(`/habit-tracker/habits/others/${result.data.id}`);
      } else {
        toast.error(result.message ?? t("Failed to create challenge"));
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Create Challenge")}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Challenge name")}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder={t("e.g. Reading, No Sugar, Morning Walk")}
            autoFocus
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">{t("Day goal")}</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value === "custom" ? "custom" : Number(e.target.value))}
            className="w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary"
          >
            {CHALLENGE_DURATIONS.map((option) => (
              <option key={option.days} value={option.days}>
                {t(option.label)}
              </option>
            ))}
            <option value="custom">{t("Custom")}</option>
          </select>
          {preset === "custom" && (
            <input
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
              inputMode="numeric"
              placeholder={t("Number of days")}
              autoFocus
              className="mt-2 w-full rounded-xl border border-neutral-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          )}
          <p className="mt-1.5 text-xs text-neutral-400">{t("Pick how many days you want to track this for.")}</p>
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
