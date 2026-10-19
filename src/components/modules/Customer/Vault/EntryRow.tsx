"use client";

import { KeyRound, Star, UserRound } from "lucide-react";
import { SOFT_TONE } from "@/components/smartly/tones";
import type { VaultEntrySummary } from "@/lib/customer/api";
import { avatarLetter } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";

interface EntryRowProps {
  entry: VaultEntrySummary;
  selected: boolean;
  // The security checkup found something to fix.
  attention: boolean;
  onSelect: () => void;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
}

const ICON_BUTTON = "flex size-11 shrink-0 items-center justify-center rounded-md text-ink-2 hover:bg-cream hover:text-ink disabled:opacity-40 md:size-8 md:text-ink-muted [&_svg]:size-4.5 md:[&_svg]:size-4";

// One login in the list: a letter, the name and the username, and copy
// buttons for the username (a person) and the password (a key). Phones get
// the board's taller row and 44px buttons.
export function EntryRow({ entry, selected, attention, onSelect, onCopyUsername, onCopyPassword }: EntryRowProps) {
  const { t } = useLocale();
  return (
    <div className={cn("box-content flex min-h-16 items-center gap-3 border-b border-surface-sunken pr-2 pl-4 max-md:bg-surface md:box-border md:min-h-12.5 md:py-1 md:pr-3 md:last:border-b-0", selected ? "bg-mint-50 shadow-[inset_3px_0_0_var(--emerald)]" : "hover:bg-cream/60")}>
      <button type="button" onClick={onSelect} aria-current={selected || undefined} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-md text-body-lg font-bold md:size-8 md:text-body", SOFT_TONE[VAULT_CATEGORY_TONE[entry.category]])}>{avatarLetter(entry.title)}</span>
        <span className="flex min-w-0 flex-col gap-0.5 md:gap-px">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-body-lg font-semibold text-ink md:text-body">{entry.title}</span>
            {entry.isFavorite && <Star className="size-3.5 shrink-0 fill-warning-fill text-warning-fill" aria-label={t("Favorite")} />}
            {attention && <span className="size-1.75 shrink-0 rounded-full bg-warning-fill" title={t("Needs attention")} aria-label={t("Needs attention")} />}
          </span>
          {entry.usernameOrEmail && <span className="truncate text-small text-ink-muted">{entry.usernameOrEmail}</span>}
        </span>
      </button>
      <button type="button" onClick={onCopyUsername} disabled={!entry.usernameOrEmail} aria-label={`${t("Copy username for")} ${entry.title}`} title={t("Copy username")} className={ICON_BUTTON}>
        <UserRound aria-hidden="true" />
      </button>
      <button type="button" onClick={onCopyPassword} aria-label={`${t("Copy password for")} ${entry.title}`} title={t("Copy password")} className={ICON_BUTTON}>
        <KeyRound aria-hidden="true" />
      </button>
    </div>
  );
}
