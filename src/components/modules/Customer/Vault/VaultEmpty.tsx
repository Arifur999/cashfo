"use client";

import { Copy, KeyRound, LockKeyhole, Plus, Sparkles } from "lucide-react";
import Card from "@/components/smartly/Card";
import IconTile from "@/components/smartly/IconTile";
import { QUICK_LOGINS, type QuickLogin } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface VaultEmptyProps {
  // null starts a blank login.
  onPick: (preset: QuickLogin | null) => void;
}

const TIPS = [
  { icon: Copy, title: "Copy in one tap", body: "Copy a username or password straight from the list, no need to open it." },
  { icon: Sparkles, title: "Strong passwords for you", body: "Generate makes a long random password, so you never reuse one." },
  { icon: LockKeyhole, title: "Locked and encrypted", body: "Passwords are stored encrypted, and the vault locks itself after 10 minutes." },
];

// An empty vault: the accounts people open most, one tap to start, and
// what the vault does for you.
export function VaultEmpty({ onPick }: VaultEmptyProps) {
  const { t } = useLocale();
  return (
    <>
      <Card padding="none" className="flex flex-col items-center gap-5 rounded-xl px-8 py-10 text-center">
        <IconTile size={48} tone="money" className="size-16 rounded-xl [&_svg]:size-7.5">
          <KeyRound strokeWidth={1.75} />
        </IconTile>
        <div className="flex max-w-130 flex-col gap-2">
          <h2 className="text-h2 leading-[normal] font-semibold tracking-[-0.01em] text-ink">{t("Save your first login")}</h2>
          <p className="text-body leading-[1.55] text-ink-muted">{t("Start with the accounts you open most. Pick one and the name and website are filled in for you.")}</p>
        </div>
        <div className="grid w-full max-w-205 grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_LOGINS.map((preset) => (
            <button key={preset.title} type="button" onClick={() => onPick(preset)} className="flex h-14 items-center gap-3 rounded-lg border border-line bg-surface px-3 text-left hover:border-line-strong">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md text-body font-bold", preset.tint)}>{preset.letter}</span>
              <span className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-body leading-[normal] font-semibold text-ink">{preset.title}</span>
                <span className="text-caption leading-[normal] font-normal text-ink-muted">{t(preset.kind)}</span>
              </span>
            </button>
          ))}
          <button type="button" onClick={() => onPick(null)} className="flex h-14 items-center gap-3 rounded-lg border-[1.5px] border-dashed border-emerald bg-mint-50 px-3 text-left">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-mint-50 text-emerald">
              <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-body leading-[normal] font-semibold text-emerald">{t("Something else")}</span>
              <span className="text-caption leading-[normal] font-normal text-ink-muted">{t("Start blank")}</span>
            </span>
          </button>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        {TIPS.map((tip) => (
          <Card key={tip.title} padding="none" elevated={false} className="flex gap-3 p-4">
            <span className="flex size-8.5 shrink-0 items-center justify-center rounded-md bg-mint-50 text-emerald">
              <tip.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-0.75">
              <span className="text-body leading-[normal] font-semibold text-ink">{t(tip.title)}</span>
              <span className="text-small leading-normal text-ink-muted">{t(tip.body)}</span>
            </span>
          </Card>
        ))}
      </div>
    </>
  );
}
