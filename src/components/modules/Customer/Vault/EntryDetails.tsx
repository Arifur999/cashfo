"use client";

import { Copy, ExternalLink, Eye, EyeOff, Star, TriangleAlert, X } from "lucide-react";
import Banner from "@/components/smartly/Banner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { SOFT_TONE } from "@/components/smartly/tones";
import type { VaultEntrySummary } from "@/lib/customer/api";
import { formatDate, monthsSince } from "@/lib/customer/date";
import { avatarLetter, hostOf, normalizeUrl, type VaultIssue } from "@/lib/customer/vaultDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { VAULT_CATEGORY_CHIP, VAULT_CATEGORY_LABELS, VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";

interface EntryDetailsProps {
  entry: VaultEntrySummary;
  // What the security checkup found for it.
  issues: VaultIssue[];
  // The password, while it is shown; the list page keeps it, so a copy
  // that failed can open the login with it on screen.
  revealed: string | null;
  // The password is on its way from the server.
  busy: boolean;
  onToggleReveal: () => void;
  onCopyPassword: () => void;
  // Copies text already on the page, with the toast to say so.
  onCopy: (text: string, message: string) => void;
  onFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
  // Inside the phone's sheet: a close button in the header.
  onClose?: () => void;
  // Its own card on a wide screen; the sheet is the frame on a phone.
  framed?: boolean;
}

// The row buttons: 32px, 44px under a finger.
const ACTION = "flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink disabled:opacity-50 pointer-coarse:size-11";

// One login in full: website, username, the password shown or copied on
// demand, the holder's name and notes.
export function EntryDetails({ entry, issues, revealed, busy, onToggleReveal, onCopyPassword, onCopy, onFavorite, onEdit, onDelete, onClose, framed = true }: EntryDetailsProps) {
  const { t, locale } = useLocale();
  const host = hostOf(entry.websiteUrl);
  const months = monthsSince(entry.passwordChangedAt, new Date());
  const monthCount = formatCount(months, locale);
  // The checkup's findings, worst first, in the board's words.
  const warnings = issues.map((issue) =>
    issue === "reused" ? t("This password is also used for another login. If one site leaks it, both are open.") : issue === "weak" ? t("This password is weak. Change it on the website with a generated one, then update it here.") : t("Password not changed for {count} months. Change it on the website, then update it here.", { count: monthCount }),
  );
  const changed = months === 0 ? t("Password changed less than a month ago") : t(months === 1 ? "Password changed {count} month ago" : "Password changed {count} months ago", { count: monthCount });
  // "Oct 2026", and in Bangla the month's own name with Bangla digits.
  const added = formatDate(entry.createdAt, locale === "bn" ? "MMMM yyyy" : "MMM yyyy", locale);

  const rows: { label: string; value: React.ReactNode; actions: React.ReactNode; wraps?: boolean }[] = [];
  if (host) {
    rows.push({
      label: t("Website"),
      value: <span className="text-emerald">{host}</span>,
      actions: (
        <a href={normalizeUrl(entry.websiteUrl ?? "")} target="_blank" rel="noopener noreferrer" aria-label={t("Open website")} title={t("Open website")} className={ACTION}>
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      ),
    });
  }
  if (entry.usernameOrEmail) {
    const username = entry.usernameOrEmail;
    rows.push({
      label: t("Username"),
      value: username,
      actions: (
        <button type="button" onClick={() => onCopy(username, t("{title} username copied", { title: entry.title }))} aria-label={t("Copy username")} title={t("Copy username")} className={ACTION}>
          <Copy className="size-4" aria-hidden="true" />
        </button>
      ),
    });
  }
  rows.push({
    label: t("Password"),
    // Shown in full, wrapping, and one tap selects it all: Show is for reading it.
    value: revealed !== null ? <span className="font-mono text-body-lg tracking-wider break-all whitespace-normal select-all">{revealed}</span> : <span className="text-body-lg tracking-[0.08em]">••••••••••••</span>,
    wraps: revealed !== null,
    actions: (
      <>
        <button type="button" onClick={onToggleReveal} disabled={busy} aria-pressed={revealed !== null} aria-label={t(revealed !== null ? "Hide password" : "Show password")} title={t(revealed !== null ? "Hide password" : "Show password")} className={ACTION}>
          {revealed !== null ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
        <button type="button" onClick={onCopyPassword} disabled={busy} aria-label={t("Copy password")} title={t("Copy password")} className={ACTION}>
          <Copy className="size-4" aria-hidden="true" />
        </button>
      </>
    ),
  });
  if (entry.holderName) {
    const holder = entry.holderName;
    rows.push({
      label: t("Account holder name"),
      value: holder,
      actions: (
        <button type="button" onClick={() => onCopy(holder, t("{title} name copied", { title: entry.title }))} aria-label={t("Copy name")} title={t("Copy name")} className={ACTION}>
          <Copy className="size-4" aria-hidden="true" />
        </button>
      ),
    });
  }

  const body = (
    <>
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <span aria-hidden="true" className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg text-h3 font-bold", SOFT_TONE[VAULT_CATEGORY_TONE[entry.category]])}>
          {avatarLetter(entry.title)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.75">
          <span className="flex min-w-0 items-center gap-1">
            <h2 className="min-w-0 truncate text-h3 text-ink">{entry.title}</h2>
            <button type="button" onClick={onFavorite} aria-pressed={entry.isFavorite} aria-label={t(entry.isFavorite ? "Remove from favorites" : "Add to favorites")} title={t(entry.isFavorite ? "Remove from favorites" : "Add to favorites")} className="flex size-7 shrink-0 items-center justify-center rounded-sm hover:bg-surface-sunken pointer-coarse:size-11">
              <Star className={cn("size-4.5", entry.isFavorite ? "fill-warning-fill text-warning-fill" : "text-ink-muted")} aria-hidden="true" />
            </button>
          </span>
          <Chip tone={VAULT_CATEGORY_CHIP[entry.category]} size="sm" className="w-fit">
            {t(VAULT_CATEGORY_LABELS[entry.category])}
          </Chip>
        </span>
        {onClose && (
          <button type="button" onClick={onClose} aria-label={t("Close")} className="-mr-2 flex size-11 shrink-0 items-center justify-center self-start rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink">
            <X className="size-5" aria-hidden="true" />
          </button>
        )}
      </div>
      {warnings.length > 0 && (
        <Banner inline tone="warning" icon={<TriangleAlert />} role="note" className="mx-4 mb-4 leading-normal">
          {warnings.join(" ")}
        </Banner>
      )}
      <dl className="flex flex-col border-t border-divider">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 border-b border-divider px-5 py-3">
            <dt className="text-caption text-ink-muted">{row.label}</dt>
            <dd className={cn("flex gap-3", row.wraps ? "items-start" : "items-center")}>
              <span className={cn("min-w-0 flex-1 text-body font-medium text-ink", !row.wraps && "truncate")}>{row.value}</span>
              <span className="flex shrink-0 gap-2">{row.actions}</span>
            </dd>
          </div>
        ))}
      </dl>
      {entry.notes && (
        <div className="flex flex-col gap-2 border-b border-divider px-5 py-3">
          <span className="text-caption text-ink-muted">{t("Notes")}</span>
          <span className="text-body leading-normal whitespace-pre-wrap wrap-anywhere text-ink-2">{entry.notes}</span>
        </div>
      )}
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="flex-1 text-caption leading-normal text-ink-muted">
          {t("Added {date}", { date: added })}
          <br />
          {changed}
        </span>
        <Button variant="outline" size="sm" onClick={onDelete} className="border-expense-line text-expense hover:bg-expense-soft hover:text-expense pointer-coarse:h-11">
          {t("Delete")}
        </Button>
        <Button variant="action" size="sm" onClick={onEdit} className="pointer-coarse:h-11">
          {t("Edit")}
        </Button>
      </div>
    </>
  );

  return framed ? (
    <Card padding="none" className="flex flex-col">
      {body}
    </Card>
  ) : (
    <div className="flex flex-col">{body}</div>
  );
}
