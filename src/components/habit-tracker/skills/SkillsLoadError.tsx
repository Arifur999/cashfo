"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";

// Shown when the skills couldn't be fetched -- never an empty page, which would
// look like "all my skills are gone".
export function SkillsLoadError() {
  const { t } = useLocale();
  return (
    <div className="px-6 py-8">
      <p className="rounded-2xl bg-surface px-6 py-10 text-center text-sm text-neutral-500 shadow-sm shadow-black/5">{t("We couldn't load your skills. Please refresh the page.")}</p>
    </div>
  );
}
