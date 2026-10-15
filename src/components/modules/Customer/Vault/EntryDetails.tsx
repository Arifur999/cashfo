"use client";

import { Copy, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { SOFT_TONE } from "@/components/smartly/tones";
import type { VaultEntrySummary } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { revealVaultEntryAction } from "@/lib/customer/passwordVaultActions";
import { avatarLetter, hostOf, normalizeUrl } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { VAULT_CATEGORY_CHIP, VAULT_CATEGORY_LABELS, VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";
import { isLockedMessage } from "./VaultPageClient";

interface EntryDetailsProps {
  entry: VaultEntrySummary;
  token: string;
  onLocked: () => void;
  onCopy: (text: string, message: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ACTION = "flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink";

// One login in full: website, username, the password shown or copied on
// demand, the holder's name and notes.
export function EntryDetails({ entry, token, onLocked, onCopy, onEdit, onDelete }: EntryDetailsProps) {
  const { t } = useLocale();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // A fresh pane for every login: nothing revealed carries over.
  const [prevId, setPrevId] = useState(entry.id);
  if (entry.id !== prevId) {
    setPrevId(entry.id);
    setRevealed(null);
  }

  async function reveal(): Promise<string | null> {
    if (revealed !== null) return revealed;
    setBusy(true);
    const result = await revealVaultEntryAction(token, entry.id);
    setBusy(false);
    if (result.success && result.data) return result.data.password;
    if (isLockedMessage(result.message)) onLocked();
    else toast.error(result.message ?? t("Failed to reveal password"));
    return null;
  }

  async function toggle() {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    setRevealed(await reveal());
  }

  async function copyPassword() {
    const password = await reveal();
    if (password !== null) onCopy(password, `${entry.title} ${t("password copied")}`);
  }

  const host = hostOf(entry.websiteUrl);
  const rows: { label: string; value: React.ReactNode; actions: React.ReactNode }[] = [];
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
    rows.push({
      label: t("Username"),
      value: entry.usernameOrEmail,
      actions: (
        <button type="button" onClick={() => onCopy(entry.usernameOrEmail ?? "", `${entry.title} ${t("username copied")}`)} aria-label={t("Copy username")} title={t("Copy username")} className={ACTION}>
          <Copy className="size-4" aria-hidden="true" />
        </button>
      ),
    });
  }
  rows.push({
    label: t("Password"),
    value: revealed !== null ? <span className="font-mono text-body-lg tracking-wider">{revealed}</span> : <span className="text-body-lg tracking-[0.08em]">••••••••••••</span>,
    actions: (
      <>
        <button type="button" onClick={toggle} disabled={busy} aria-label={t(revealed !== null ? "Hide password" : "Show password")} title={t(revealed !== null ? "Hide password" : "Show password")} className={ACTION}>
          {revealed !== null ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
        <button type="button" onClick={copyPassword} disabled={busy} aria-label={t("Copy password")} title={t("Copy password")} className={ACTION}>
          <Copy className="size-4" aria-hidden="true" />
        </button>
      </>
    ),
  });
  if (entry.holderName) {
    rows.push({
      label: t("Account holder name"),
      value: entry.holderName,
      actions: (
        <button type="button" onClick={() => onCopy(entry.holderName ?? "", `${entry.title} ${t("name copied")}`)} aria-label={t("Copy name")} title={t("Copy name")} className={ACTION}>
          <Copy className="size-4" aria-hidden="true" />
        </button>
      ),
    });
  }

  return (
    <Card padding="none" className="flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg text-h3 font-bold", SOFT_TONE[VAULT_CATEGORY_TONE[entry.category]])}>{avatarLetter(entry.title)}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.75">
          <h2 className="truncate text-h3 font-semibold text-ink">{entry.title}</h2>
          <Chip tone={VAULT_CATEGORY_CHIP[entry.category]} size="sm" className="w-fit">
            {t(VAULT_CATEGORY_LABELS[entry.category])}
          </Chip>
        </span>
      </div>
      <dl className="flex flex-col border-t border-surface-sunken">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 border-b border-surface-sunken px-5 py-3">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <dt className="text-caption text-ink-muted">{row.label}</dt>
              <dd className="truncate text-body font-medium text-ink">{row.value}</dd>
            </span>
            {row.actions}
          </div>
        ))}
      </dl>
      {entry.notes && (
        <div className="flex flex-col gap-2 border-b border-surface-sunken px-5 py-3">
          <span className="text-caption text-ink-muted">{t("Notes")}</span>
          <span className="text-body leading-normal whitespace-pre-wrap text-ink-2">{entry.notes}</span>
        </div>
      )}
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="flex-1 text-caption leading-normal text-ink-muted">
          {t("Added")} {formatDate(entry.createdAt, "MMM yyyy")}
          <br />
          {t("Updated")} {formatDate(entry.updatedAt, "d MMM yyyy")}
        </span>
        <Button variant="outline" size="sm" onClick={onDelete} className="border-expense/40 text-expense hover:bg-expense-soft">
          {t("Delete")}
        </Button>
        <Button variant="action" size="sm" onClick={onEdit}>
          {t("Edit")}
        </Button>
      </div>
    </Card>
  );
}
