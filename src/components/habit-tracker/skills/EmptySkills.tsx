"use client";

import { Plus } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { DISPLAY_STACK } from "./fonts";
import { SKILL_CARD, SKILL_CTA } from "./skillTheme";
import { SkillTile } from "./SkillTile";

// A first-time learner's page: three tiles leaning on each other and a nudge to
// add the first skill.
export function EmptySkills({ onAdd }: { onAdd: () => void }) {
  const { t } = useLocale();
  return (
    <div className={`${SKILL_CARD} flex flex-col items-center px-6 py-14 text-center`}>
      <div aria-hidden className="relative mb-8 h-40 w-80">
        <div className="absolute bottom-0 left-4 w-24 -rotate-6">
          <SkillTile icon="code" color="violet" className="w-full" />
        </div>
        <div className="absolute bottom-2 left-1/2 z-10 w-28 -translate-x-1/2">
          <SkillTile icon="music" color="lime" className="w-full" />
        </div>
        <div className="absolute bottom-0 right-4 w-24 rotate-6">
          <SkillTile icon="languages" color="rose" className="w-full" />
        </div>
      </div>
      <h2 className="text-2xl font-semibold text-neutral-900" style={{ fontFamily: DISPLAY_STACK }}>
        {t("Your learning list is empty -- for now")}
      </h2>
      <p className="mt-2 max-w-md text-sm text-neutral-500">{t("Add a course or a skill you want to learn. It takes ten seconds.")}</p>
      <button type="button" onClick={onAdd} className={`${SKILL_CTA} mt-6`}>
        <Plus className="h-4 w-4" /> {t("Add Skill")}
      </button>
    </div>
  );
}
