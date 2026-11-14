"use client";

import { Copy, KeyRound, Shield, Sparkles } from "lucide-react";
import Card from "@/components/smartly/Card";
import { SOFT_TONE } from "@/components/smartly/tones";
import { avatarLetter, presetTitle, QUICK_LOGINS, type QuickLogin } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";

interface VaultEmptyProps {
  // null starts a blank login.
  onPick: (preset: QuickLogin | null) => void;
}

const TIPS = [
  { icon: Copy, title: "Copy in one tap", body: "Copy a username or password straight from the list, no need to open it." },
  { icon: Sparkles, title: "Strong passwords for you", body: "Generate makes a long random password, so you never reuse one." },
  { icon: Shield, title: "A checkup for your logins", body: "It points out weak, reused and old passwords so you know what to change first." },
];

// A 56px tile, four to a row of 196px (two on a phone, where both lines
// truncate instead of spilling out of the tile).
const TILE = "flex h-14 min-w-0 items-center gap-3 rounded-[12px] px-3 text-left leading-[normal]";

// An empty vault (design VaultEmpty): the accounts people open most, one
// tap to start, and what the vault does for you.
export function VaultEmpty({ onPick }: VaultEmptyProps) {
  const { t } = useLocale();
  return (
    <>
      <Card padding="none" className="flex flex-col items-center gap-3 rounded-[20px] px-4 py-10 text-center sm:px-8">
        <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-[18px] bg-emerald-soft text-brand-ink">
          <KeyRound className="size-7.5" />
        </span>
        <h2 className="mt-1 text-[22px] leading-[normal] font-semibold text-ink">{t("Save your first login")}</h2>
        <p className="max-w-130 text-[14.5px] leading-[1.55] text-ink-2">{t("Start with the accounts you open most. Pick one and the name and website are filled in for you.")}</p>
        <div className="mt-2.5 grid w-full grid-cols-2 gap-2.5 sm:w-auto sm:grid-cols-[repeat(4,196px)]">
          {QUICK_LOGINS.map((preset) => (
            <button key={preset.title} type="button" onClick={() => onPick(preset)} className={cn(TILE, "border border-line bg-surface hover:border-input")}>
              <span aria-hidden="true" className={cn("flex size-8 shrink-0 items-center justify-center rounded-[9px] text-body font-bold", SOFT_TONE[VAULT_CATEGORY_TONE[preset.category]])}>
                {avatarLetter(presetTitle(preset, t))}
              </span>
              <span className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-body font-semibold text-ink">{presetTitle(preset, t)}</span>
                <span className="truncate text-caption text-ink-muted">{t(preset.kind)}</span>
              </span>
            </button>
          ))}
          <button type="button" onClick={() => onPick(null)} className={cn(TILE, "border-[1.5px] border-dashed border-emerald bg-emerald-soft")}>
            <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-[9px] text-body font-bold text-brand-ink">
              +
            </span>
            <span className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-body font-semibold text-brand-ink">{t("Something else")}</span>
              <span className="truncate text-caption text-ink-muted">{t("Start blank")}</span>
            </span>
          </button>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {TIPS.map((tip) => (
          <Card key={tip.title} padding="none" elevated={false} className="flex gap-3 rounded-lg p-4.5 leading-[normal]">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-surface-sunken text-brand-ink">
              <tip.icon className="size-3.75" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-0.75">
              <span className="text-body font-semibold text-ink">{t(tip.title)}</span>
              <span className="text-[13px] leading-normal text-ink-muted">{t(tip.body)}</span>
            </span>
          </Card>
        ))}
      </div>
    </>
  );
}
