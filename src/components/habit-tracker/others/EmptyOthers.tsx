"use client";

import { ListChecks, Plus } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { DISPLAY_STACK } from "./fonts";
import { OTHER_CARD, OTHER_CTA } from "./otherTheme";

// A first-time user's page: an empty checklist icon and a nudge to add the
// first habit.
export function EmptyOthers({ onAdd }: { onAdd: () => void }) {
  const { t } = useLocale();
  return (
    <div className={`${OTHER_CARD} flex flex-col items-center px-6 py-14 text-center`}>
      <span aria-hidden className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-600/10 text-slate-500 dark:text-amber-300">
        <ListChecks className="h-10 w-10" />
      </span>
      <h2 className="text-2xl font-semibold text-neutral-900" style={{ fontFamily: DISPLAY_STACK }}>
        {t("Nothing tracked here yet")}
      </h2>
      <p className="mt-2 max-w-md text-sm text-neutral-500">{t("Add anything you want to build as a daily or weekly habit. It takes ten seconds.")}</p>
      <button type="button" onClick={onAdd} className={`${OTHER_CTA} mt-6`}>
        <Plus className="h-4 w-4" /> {t("Add Habit")}
      </button>
    </div>
  );
}
