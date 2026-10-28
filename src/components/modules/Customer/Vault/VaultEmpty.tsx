"use client";

import { Copy, KeyRound, Plus, Shield, Sparkles } from "lucide-react";
import Card from "@/components/smartly/Card";
import { presetTitle, QUICK_LOGINS, type QuickLogin } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface VaultEmptyProps {
  // null starts a blank login.
  onPick: (preset: QuickLogin | null) => void;
}

const TIPS = [
  { icon: Copy, title: "Copy in one tap", body: "Copy a username or password straight from the list, no need to open it." },
  { icon: Sparkles, title: "Strong passwords for you", body: "Generate makes a long random password, so you never reuse one." },
  { icon: Shield, title: "A checkup for your logins", body: "It points out weak, reused and old passwords so you know what to change first." },
];

// At least 56px, growing rather than spilling when the text is taller; on a
// 390px phone both lines truncate instead of wrapping out of the tile.
const TILE = "flex min-h-14 items-center gap-2.5 rounded-xl px-3 py-2 text-left";

// An empty vault: the accounts people open most, one tap to start, and
// what the vault does for you.
export function VaultEmpty({ onPick }: VaultEmptyProps) {
  const { t } = useLocale();
  return (
    <>
      <Card padding="none" className="flex flex-col items-center gap-5 px-4 py-10 text-center sm:px-8">
        <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-[18px] bg-emerald-soft text-emerald">
          <KeyRound className="size-7.5" strokeWidth={1.75} />
        </span>
        <div className="flex max-w-130 flex-col gap-1.5">
          <h2 className="text-h2 font-semibold tracking-[-0.01em] text-ink">{t("Save your first login")}</h2>
          <p className="text-[14.5px] leading-[1.55] text-ink-muted">{t("Start with the accounts you open most. Pick one and the name and website are filled in for you.")}</p>
        </div>
        <div className="grid w-full max-w-[814px] grid-cols-2 gap-2.5 sm:grid-cols-4">
          {QUICK_LOGINS.map((preset) => (
            <button key={preset.title} type="button" onClick={() => onPick(preset)} className={cn(TILE, "border border-line bg-surface hover:border-line-strong")}>
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[9px] text-body font-bold", preset.tint)}>{preset.letter}</span>
              <span className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-[13.5px] font-semibold text-ink">{presetTitle(preset, t)}</span>
                <span className="truncate text-[11.5px] leading-normal text-ink-muted">{t(preset.kind)}</span>
              </span>
            </button>
          ))}
          <button type="button" onClick={() => onPick(null)} className={cn(TILE, "border-[1.5px] border-dashed border-emerald bg-emerald-soft")}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] text-emerald">
              <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-[13.5px] font-semibold text-emerald">{t("Something else")}</span>
              <span className="truncate text-[11.5px] leading-normal text-ink-muted">{t("Start blank")}</span>
            </span>
          </button>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {TIPS.map((tip) => (
          <Card key={tip.title} padding="none" className="flex gap-3 p-4">
            <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-emerald-soft text-emerald">
              <tip.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-0.75">
              <span className="text-body font-semibold text-ink">{t(tip.title)}</span>
              <span className="text-small leading-normal text-ink-muted">{t(tip.body)}</span>
            </span>
          </Card>
        ))}
      </div>
    </>
  );
}
