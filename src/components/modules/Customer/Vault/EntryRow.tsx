"use client";

import { Copy, KeyRound } from "lucide-react";
import { SOFT_TONE } from "@/components/smartly/tones";
import type { VaultEntrySummary } from "@/lib/customer/api";
import { avatarLetter } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";

interface EntryRowProps {
  entry: VaultEntrySummary;
  selected: boolean;
  onSelect: () => void;
  onCopyUsername: () => void;
  onCopyPassword: () => void;
}

const ICON_BUTTON = "flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-cream hover:text-ink disabled:opacity-40";

// One login in the list: a letter, the name and the username, and copy
// buttons for the username and the password.
export function EntryRow({ entry, selected, onSelect, onCopyUsername, onCopyPassword }: EntryRowProps) {
  const { t } = useLocale();
  return (
    <div className={cn("flex min-h-12.5 items-center gap-3 border-b border-surface-sunken py-1 pr-3 pl-4 last:border-b-0", selected ? "bg-mint-50 shadow-[inset_3px_0_0_var(--emerald)]" : "hover:bg-cream/60")}>
      <button type="button" onClick={onSelect} aria-current={selected || undefined} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md text-body font-bold", SOFT_TONE[VAULT_CATEGORY_TONE[entry.category]])}>{avatarLetter(entry.title)}</span>
        <span className="flex min-w-0 flex-col gap-px">
          <span className="truncate text-body font-semibold text-ink">{entry.title}</span>
          {entry.usernameOrEmail && <span className="truncate text-small text-ink-muted">{entry.usernameOrEmail}</span>}
        </span>
      </button>
      <button type="button" onClick={onCopyUsername} disabled={!entry.usernameOrEmail} aria-label={`${t("Copy username for")} ${entry.title}`} title={t("Copy username")} className={ICON_BUTTON}>
        <Copy className="size-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={onCopyPassword} aria-label={`${t("Copy password for")} ${entry.title}`} title={t("Copy password")} className={ICON_BUTTON}>
        <KeyRound className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
