"use client";

import { BookOpen, Briefcase, Code, GraduationCap, Link2, Loader, MessageCircle, Palette, Video } from "lucide-react";
import type { Skill, SkillResourceKind } from "@/lib/customer/api";
import { categoryOf, STATE_INFO, type SkillState } from "@/lib/customer/skillsBoard";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { paletteFor } from "./skillPalette";

// The six categories' icons (the SkillsList board's paths are these lucide ones).
const CATEGORY_ICON = { tech: Code, lang: MessageCircle, design: Palette, biz: Briefcase, deen: BookOpen, life: Loader } as const;
export const RESOURCE_ICON: Record<SkillResourceKind, typeof Code> = { COURSE: GraduationCap, VIDEO: Video, BOOK: BookOpen, LINK: Link2 };

export function CategoryIcon({ category, className, strokeWidth = 2 }: { category: string | undefined; className?: string; strokeWidth?: number }) {
  const Icon = CATEGORY_ICON[categoryOf(category).id];
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

// A skill's two colours, for gradients and tints.
export const skillColors = (skill: Pick<Skill, "color">) => {
  const palette = paletteFor(skill.color);
  return { color: palette.from, dark: palette.to, soft: `color-mix(in srgb, ${palette.from} 9%, var(--surface))`, line: `color-mix(in srgb, ${palette.from} 30%, var(--surface))` };
};

// The rounded square in the skill's colour with its category's icon.
export function SkillBadge({ skill, className, iconClassName, rounded = "rounded-[13px]" }: { skill: Pick<Skill, "color" | "category">; className?: string; iconClassName?: string; rounded?: string }) {
  const { color, dark } = skillColors(skill);
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center text-white", rounded, className)} style={{ background: `linear-gradient(155deg, ${color} 0%, ${dark} 100%)` }}>
      <CategoryIcon category={skill.category} className={cn("size-5.5", iconClassName)} />
    </span>
  );
}

// The state as a pill with its dot.
export function StateChip({ state, className }: { state: SkillState; className?: string }) {
  const { t } = useLocale();
  const info = STATE_INFO[state];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.75 text-[12.5px] font-semibold whitespace-nowrap", info.chip, className)}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", info.dot)} />
      {t(info.label)}
    </span>
  );
}
