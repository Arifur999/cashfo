"use client";

import { Check, Clock, Copy, ExternalLink, Eye, EyeOff, PenLine, Pencil, Star, Trash2, TriangleAlert } from "lucide-react";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import { SOFT_TONE } from "@/components/smartly/tones";
import type { VaultEntrySummary } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { avatarLetter, hostOf, normalizeUrl, passwordAge, type Safety, type VaultIssue } from "@/lib/customer/vaultDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { SafetyBadge } from "./SafetyBadge";
import { VAULT_CATEGORY_CHIP, VAULT_CATEGORY_LABELS, VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";
import { VaultDialog } from "./VaultDialog";

interface EntryDetailsProps {
  // The login on show; null closes the popup.
  entry: VaultEntrySummary | null;
  onClose: () => void;
  // What the security checkup found for it, and its badge (null before the
  // checkup answers).
  issues: VaultIssue[];
  safety: Safety | null;
  // The password, while it is shown; the page keeps it, so a copy that
  // failed can open the login with it on screen.
  revealed: string | null;
  // The password is on its way from the server.
  busy: boolean;
  // The button just used, ticked for a moment: "username" or "password".
  copied: string | null;
  onToggleReveal: () => void;
  onCopyPassword: () => void;
  onCopyUsername: () => void;
  // Copies text already on the page, with the toast to say so.
  onCopy: (text: string, message: string) => void;
  onFavorite: () => void;
  onEdit: () => void;
  // Change this password: the edit popup, ready for a new one.
  onFix: () => void;
  onDelete: () => void;
}

// A field's pill button: a word and its icon, 44px under a finger.
function Action({ label, icon: Icon, onClick, href, on = false, disabled = false, pressed }: { label: string; icon: typeof Copy; onClick?: () => void; href?: string; on?: boolean; disabled?: boolean; pressed?: boolean }) {
  const className = cn(
    "flex h-8.5 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold whitespace-nowrap disabled:opacity-50 pointer-coarse:h-11 [&_svg]:size-3.25",
    on ? "border-emerald bg-emerald-soft text-emerald" : "border-line-strong bg-surface text-ink-2 hover:bg-surface-sunken",
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        <Icon strokeWidth={2.25} aria-hidden="true" />
        {label}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={pressed} className={className}>
      <Icon strokeWidth={2.25} aria-hidden="true" />
      {label}
    </button>
  );
}

// A login in full (design: the details popup): website, username, the
// password shown or copied on demand, the holder's name and notes, what the
// checkup found with a button to fix it, and Delete, Close and Edit.
export function EntryDetails({ entry, onClose, issues, safety, revealed, busy, copied, onToggleReveal, onCopyPassword, onCopyUsername, onCopy, onFavorite, onEdit, onFix, onDelete }: EntryDetailsProps) {
  const { t, locale, fmt } = useLocale();
  if (!entry) return <VaultDialog open={false} onClose={onClose} title="" />;

  const host = hostOf(entry.websiteUrl);
  const age = passwordAge(entry.passwordChangedAt, new Date());
  const ageText = t(age.key, { count: formatCount(age.count, fmt) });
  const months = age.key.includes("month") ? formatCount(age.count, fmt) : formatCount(0, fmt);
  // The checkup's findings, worst first, in the board's words.
  const warnings = issues.map((issue) => ({
    issue,
    text: issue === "reused" ? t("This password is also used for another login. If one site leaks it, both are open.") : issue === "weak" ? t("This password is easy to guess. Use Generate when you change it.") : t("Password not changed for {count} months. Change it on the website, then update it here.", { count: months }),
  }));
  // "Jan 2025", and in Bangla the month's own name with Bangla digits.
  const added = formatDate(entry.createdAt, locale === "bn" ? "MMMM yyyy" : "MMM yyyy", fmt);

  const rows: { label: string; value: React.ReactNode; actions: React.ReactNode; wraps?: boolean; link?: boolean }[] = [];
  if (host) {
    rows.push({ label: t("Website"), value: host, link: true, actions: <Action label={t("Open")} icon={ExternalLink} href={normalizeUrl(entry.websiteUrl ?? "")} /> });
  }
  rows.push({
    label: t("Username"),
    value: entry.usernameOrEmail || "—",
    actions: entry.usernameOrEmail ? <Action label={t(copied === "username" ? "Copied" : "Copy")} icon={copied === "username" ? Check : Copy} on={copied === "username"} onClick={onCopyUsername} /> : null,
  });
  rows.push({
    label: t("Password"),
    // Shown in full, wrapping, and one tap selects it all.
    value: revealed !== null ? <span className="font-mono text-[14.5px] tracking-[0.03em] break-all whitespace-normal select-all">{revealed}</span> : <span className="text-body-lg tracking-[0.08em]">••••••••••••••</span>,
    wraps: revealed !== null,
    actions: (
      <>
        <Action label={t(revealed !== null ? "Hide" : "Show")} icon={revealed !== null ? EyeOff : Eye} on={revealed !== null} pressed={revealed !== null} disabled={busy} onClick={onToggleReveal} />
        <Action label={t(copied === "password" ? "Copied" : "Copy")} icon={copied === "password" ? Check : Copy} on={copied === "password"} disabled={busy} onClick={onCopyPassword} />
      </>
    ),
  });
  if (entry.holderName) {
    const holder = entry.holderName;
    rows.push({ label: t("Account holder name"), value: holder, actions: <Action label={t("Copy")} icon={Copy} onClick={() => onCopy(holder, t("Account holder name copied"))} /> });
  }

  const lead = (
    <span aria-hidden="true" className={cn("flex size-11 shrink-0 items-center justify-center rounded-[13px] text-[18px] font-bold sm:size-13 sm:rounded-[15px] sm:text-[21px]", SOFT_TONE[VAULT_CATEGORY_TONE[entry.category]])}>
      {avatarLetter(entry.title)}
    </span>
  );
  const sub = (
    <span className="flex flex-wrap items-center gap-2">
      <Chip tone={VAULT_CATEGORY_CHIP[entry.category]} size="sm" className="h-auto w-fit px-2 py-px text-[11.5px]">
        {t(VAULT_CATEGORY_LABELS[entry.category])}
      </Chip>
      {safety && <SafetyBadge safety={safety} icon={false} className="px-2 py-px text-[11.5px]" />}
    </span>
  );
  const star = (
    <button type="button" onClick={onFavorite} aria-pressed={entry.isFavorite} aria-label={t(entry.isFavorite ? "Remove from favorites" : "Add to favorites")} title={t(entry.isFavorite ? "Remove from favorites" : "Add to favorites")} className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface hover:bg-surface-sunken pointer-coarse:size-11">
      <Star className={cn("size-4.5", entry.isFavorite ? "fill-warning-fill text-warning-fill" : "text-ink-faint")} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );

  return (
    <VaultDialog
      open
      onClose={onClose}
      title={entry.title}
      sub={sub}
      lead={lead}
      actions={star}
      bodyClassName="gap-2.5 px-4 pb-4.5 sm:px-5"
      footer={
        <>
          <Button variant="ghost" onClick={onDelete} className="h-10 px-3 text-expense hover:bg-expense-soft hover:text-expense pointer-coarse:h-11">
            <Trash2 className="size-3.75" />
            {t("Delete")}
          </Button>
          <span className="flex-1" />
          <Button variant="secondary" onClick={onClose} className="h-10 max-sm:hidden">
            {t("Close")}
          </Button>
          <Button variant="action" onClick={onEdit} className="h-10 px-4.5 pointer-coarse:h-11">
            <Pencil className="size-3.5" />
            {t("Edit")}
          </Button>
        </>
      }
    >
      {warnings.map((warning) => {
        const Icon = warning.issue === "old" ? Clock : TriangleAlert;
        return (
          <div key={warning.issue} role="note" className="flex items-start gap-2.5 rounded-[14px] border border-warning-line bg-warning-50 px-3.5 py-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <span className="flex flex-1 flex-col items-start gap-2">
              <span className="text-[13.5px] leading-normal text-warning-ink">{warning.text}</span>
              <Button size="sm" onClick={onFix} className="h-8 bg-warning px-3 text-[12.5px] text-white shadow-none hover:bg-warning/90 pointer-coarse:h-11">
                <PenLine className="size-3.5" />
                {t("Change this password")}
              </Button>
            </span>
          </div>
        );
      })}
      <dl className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.label} className={cn("flex gap-2.5 rounded-[14px] border border-divider bg-strip px-3.5 py-3", row.wraps ? "items-start" : "items-center")}>
            <div className="flex min-w-0 flex-1 flex-col gap-0.75">
              <dt className="text-caption font-medium text-ink-muted">{row.label}</dt>
              <dd className={cn("min-w-0 text-body font-medium", row.link ? "text-emerald" : "text-ink", !row.wraps && "truncate")}>{row.value}</dd>
            </div>
            {row.actions && <span className="flex shrink-0 flex-wrap justify-end gap-1.5">{row.actions}</span>}
          </div>
        ))}
      </dl>
      {entry.notes && (
        <div className="flex flex-col gap-1.5 rounded-[14px] border border-divider bg-strip px-3.5 py-3">
          <span className="text-caption font-medium text-ink-muted">{t("Notes")}</span>
          <span className="text-body leading-normal whitespace-pre-wrap wrap-anywhere text-ink-2">{entry.notes}</span>
        </div>
      )}
      <span className="px-1 text-caption text-ink-faint">
        {t("Added {date}", { date: added })} · {t("Password changed {age}", { age: age.key === "Today" ? t("today") : ageText })}
      </span>
    </VaultDialog>
  );
}
