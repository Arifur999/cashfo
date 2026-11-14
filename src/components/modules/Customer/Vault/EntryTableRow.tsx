"use client";

import { Check, Eye, KeyRound, PencilLine, Star, UserRound } from "lucide-react";
import { memo } from "react";
import { SOFT_TONE } from "@/components/smartly/tones";
import type { VaultEntrySummary } from "@/lib/customer/api";
import { avatarLetter, hostOf, passwordAge, type Safety } from "@/lib/customer/vaultDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SafetyBadge } from "./SafetyBadge";
import { VAULT_CATEGORY_LABELS, VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";

// The wide list's columns (design VaultHome): # · Login · Website · Safety
// · Change · View.
// A row is the number, the three middle columns in a grid of their own,
// then Change and View, 10px apart; the middle columns sit 12px apart.
export const TABLE_ROW = "flex items-center gap-2.5 pr-3.5";
export const TABLE_MIDDLE = "grid min-w-0 flex-1 grid-cols-[minmax(0,1.3fr)_minmax(180px,1fr)_124px] items-center gap-x-3";

interface RowProps {
  entry: VaultEntrySummary;
  // Its place in the list, from 1.
  number: number;
  // Its badge; null while the checkup hasn't answered.
  safety: Safety | null;
  // The page hands every row the same handlers.
  onView: (id: string) => void;
  onChange: (entry: VaultEntrySummary) => void;
}

function useAge(entry: VaultEntrySummary) {
  const { t, fmt } = useLocale();
  const age = passwordAge(entry.passwordChangedAt, new Date());
  return t(age.key, { count: formatCount(age.count, fmt) });
}

// One login in the wide table. Only View opens it; Change opens the
// change-password popup and is amber when the login has a problem. Drawn
// again only when its own props change.
export const EntryTableRow = memo(function EntryTableRow({ entry, number, safety, onView, onChange }: RowProps) {
  const { t, fmt } = useLocale();
  const age = useAge(entry);
  const host = hostOf(entry.websiteUrl);
  const problem = safety !== null && safety !== "safe";
  return (
    <div role="row" className={cn(TABLE_ROW, "min-h-[65px] border-b border-page leading-[normal]")}>
      <span role="cell" className="w-12 shrink-0 text-center text-[13px] font-medium text-ink-faint tabular-nums">
        {formatCount(number, fmt)}
      </span>
      <div className={TABLE_MIDDLE}>
        <span role="cell" className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-[12px] text-body-lg font-bold", SOFT_TONE[VAULT_CATEGORY_TONE[entry.category]])}>
            {avatarLetter(entry.title)}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[15px] font-semibold text-ink">{entry.title}</span>
              {entry.isFavorite && <Star className="size-3.25 shrink-0 fill-warning-fill text-warning-fill" strokeWidth={1.5} role="img" aria-label={t("Starred")} />}
            </span>
            <span className="truncate text-[13px] text-ink-muted">{entry.usernameOrEmail || "—"}</span>
          </span>
        </span>
        <span role="cell" className="flex min-w-0 flex-col gap-0.5">
          <span className={cn("truncate text-[13px]", host ? "text-ink-2" : "text-ink-faint")}>{host || "—"}</span>
          <span className="truncate text-caption text-ink-faint">
            {t(VAULT_CATEGORY_LABELS[entry.category])} · {age}
          </span>
        </span>
        <span role="cell">{safety ? <SafetyBadge safety={safety} /> : <span className="text-caption text-ink-faint">…</span>}</span>
      </div>
      <span role="cell" className="shrink-0">
        <button
          type="button"
          onClick={() => onChange(entry)}
          aria-label={t("Change password for {title}", { title: entry.title })}
          title={t(problem ? "This password needs a fix. Change it" : "Change this password")}
          className={cn(
            "flex h-8.5 w-28 items-center justify-center gap-1.5 rounded-full border text-[12.5px] font-semibold whitespace-nowrap pointer-coarse:h-11",
            problem ? "border-warning-line bg-warning-soft text-warning hover:bg-warning-soft/70" : "border-input bg-surface text-ink-2 hover:bg-surface-sunken",
          )}
        >
          <PencilLine className="size-3.25" strokeWidth={2.25} aria-hidden="true" />
          {t("Change")}
        </button>
      </span>
      <span role="cell" className="shrink-0">
        <button type="button" onClick={() => onView(entry.id)} aria-label={t("View {title}", { title: entry.title })} className="flex h-8.5 w-25 items-center justify-center gap-1.5 rounded-full bg-primary text-[12.5px] font-semibold whitespace-nowrap text-primary-foreground hover:bg-emerald-hover pointer-coarse:h-11">
          <Eye className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
          {t("View")}
        </button>
      </span>
    </div>
  );
});

interface CardProps {
  entry: VaultEntrySummary;
  safety: Safety | null;
  // The button just used, ticked for a moment.
  copied: "username" | "password" | null;
  onView: (id: string) => void;
  onCopyUsername: (entry: VaultEntrySummary) => void;
  onCopyPassword: (entry: VaultEntrySummary) => void;
}

// One login as a card (the Cards layout): the name opens it; Copy username
// and Copy password underneath.
export const EntryCard = memo(function EntryCard({ entry, safety, copied, onView, onCopyUsername, onCopyPassword }: CardProps) {
  const { t } = useLocale();
  const age = useAge(entry);
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line-card bg-surface p-3.5 leading-[normal] shadow-sm">
      <button type="button" onClick={() => onView(entry.id)} className="flex min-w-0 items-center gap-3 rounded-md text-left">
        <span aria-hidden="true" className={cn("flex size-10.5 shrink-0 items-center justify-center rounded-[12px] text-[17px] font-bold", SOFT_TONE[VAULT_CATEGORY_TONE[entry.category]])}>
          {avatarLetter(entry.title)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold text-ink">{entry.title}</span>
            {entry.isFavorite && <Star className="size-3.25 shrink-0 fill-warning-fill text-warning-fill" strokeWidth={1.5} role="img" aria-label={t("Starred")} />}
          </span>
          <span className="truncate text-[12.5px] text-ink-muted">{entry.usernameOrEmail || "—"}</span>
        </span>
      </button>
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-caption text-ink-faint">
          {t(VAULT_CATEGORY_LABELS[entry.category])} · {age}
        </span>
        {safety && <SafetyBadge safety={safety} icon={false} className="px-2 py-0.5 text-[11.5px]" />}
      </span>
      <span className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onCopyUsername(entry)}
          disabled={!entry.usernameOrEmail}
          aria-label={t("Copy username for {title}", { title: entry.title })}
          className={cn("flex h-8.5 items-center justify-center gap-1.5 rounded-full border text-caption font-semibold whitespace-nowrap disabled:opacity-40 pointer-coarse:h-11", copied === "username" ? "border-emerald bg-emerald-soft text-brand-ink" : "border-input bg-surface text-ink-2 hover:bg-surface-sunken")}
        >
          {copied === "username" ? <Check className="size-3.25" aria-hidden="true" /> : <UserRound className="size-3.25" aria-hidden="true" />}
          {t(copied === "username" ? "Copied" : "Copy username")}
        </button>
        <button
          type="button"
          onClick={() => onCopyPassword(entry)}
          aria-label={t("Copy password for {title}", { title: entry.title })}
          className={cn("flex h-8.5 items-center justify-center gap-1.5 rounded-full text-caption font-semibold whitespace-nowrap pointer-coarse:h-11", copied === "password" ? "bg-emerald-soft text-emerald" : "bg-primary text-primary-foreground hover:bg-emerald-hover")}
        >
          {copied === "password" ? <Check className="size-3.25" aria-hidden="true" /> : <KeyRound className="size-3.25" aria-hidden="true" />}
          {t(copied === "password" ? "Copied" : "Copy password")}
        </button>
      </span>
    </div>
  );
});
