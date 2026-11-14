"use client";

import { KeyRound, UserRound } from "lucide-react";
import { memo } from "react";
import { ListCell, ListRow, ListRowActions, ListRowButton } from "@/components/smartly/list";
import { SOFT_TONE } from "@/components/smartly/tones";
import type { VaultEntrySummary } from "@/lib/customer/api";
import { avatarLetter } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";

interface EntryRowProps {
  entry: VaultEntrySummary;
  // The same grid template as the list's head.
  columns: string;
  selected: boolean;
  // The security checkup found something to fix.
  attention: boolean;
  // Each takes the row, so the page hands every row the same three.
  onSelect: (id: string) => void;
  onCopyUsername: (entry: VaultEntrySummary) => void;
  onCopyPassword: (entry: VaultEntrySummary) => void;
}

const ICON_BUTTON = "flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-sunken hover:text-ink disabled:opacity-40 md:size-8 md:text-ink-muted [&_svg]:size-4.5 md:[&_svg]:size-4";

// One login in the list: a letter, the name and the username, and copy
// buttons for the username (a person) and the password (a key). The name
// opens the login, the whole row being its target. Phones get the board's
// taller row and 44px buttons. Drawn again only when its own props change:
// the page is drawn on every keystroke in the drawer, over hundreds of rows.
export const EntryRow = memo(function EntryRow({ entry, columns, selected, attention, onSelect, onCopyUsername, onCopyPassword }: EntryRowProps) {
  const { t } = useLocale();
  return (
    <ListRow columns={columns} density="relaxed" selected={selected} className={cn("min-h-[65px] gap-x-1 border-page py-0 pr-2 leading-[normal] md:h-12.5 md:min-h-12.5 md:gap-x-3 md:pr-3 md:pl-4", selected && "bg-emerald-soft shadow-[inset_3px_0_0_var(--emerald)]")}>
      <ListCell>
        <ListRowButton onClick={() => onSelect(entry.id)} aria-current={selected || undefined} className="flex items-center gap-3">
          <span className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-[11px] text-body-lg font-bold md:size-8 md:rounded-[9px] md:text-body", SOFT_TONE[VAULT_CATEGORY_TONE[entry.category]])}>{avatarLetter(entry.title)}</span>
          <span className="flex min-w-0 flex-col gap-0.5 md:gap-px">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[15px] font-semibold text-ink md:text-body">{entry.title}</span>
              {attention && (
                <>
                  <span className="size-1.75 shrink-0 rounded-full bg-warning-fill" aria-hidden="true" />
                  <span className="sr-only">{t("Needs attention")}</span>
                </>
              )}
            </span>
            {entry.usernameOrEmail && <span className="truncate text-small text-ink-muted md:text-[12.5px]">{entry.usernameOrEmail}</span>}
          </span>
        </ListRowButton>
      </ListCell>
      <ListRowActions className="gap-0">
        <button type="button" onClick={() => onCopyUsername(entry)} disabled={!entry.usernameOrEmail} aria-label={t("Copy username for {title}", { title: entry.title })} title={t("Copy username")} className={ICON_BUTTON}>
          <UserRound aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onCopyPassword(entry)} aria-label={t("Copy password for {title}", { title: entry.title })} title={t("Copy password")} className={ICON_BUTTON}>
          <KeyRound aria-hidden="true" />
        </button>
      </ListRowActions>
    </ListRow>
  );
});
