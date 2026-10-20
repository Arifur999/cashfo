"use client";

import { ChevronLeft, Clock, Copy, ExternalLink, Info, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import Chip from "@/components/smartly/Chip";
import { SOFT_TONE } from "@/components/smartly/tones";
import type { VaultCheckup as Checkup, VaultEntrySummary } from "@/lib/customer/api";
import { monthsSince } from "@/lib/customer/date";
import { attentionIds, avatarLetter, type VaultIssue } from "@/lib/customer/vaultDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";

interface VaultCheckupProps {
  entries: VaultEntrySummary[];
  checkup: Checkup;
  busy: boolean;
  onBack: () => void;
  // Opens the website (when there is one) and the login, to save the new
  // password.
  onChange: (entry: VaultEntrySummary) => void;
  onFine: (entry: VaultEntrySummary) => void;
}

// Each group's look and words, in the board's order.
const GROUPS: { issue: VaultIssue; title: string; why: string; tag: string; icon: typeof Copy; tile: string; count: string; bar: string; legend: string }[] = [
  { issue: "reused", title: "Same password on more than one site", why: "These logins share a password with another. If one site leaks it, the others are open too.", tag: "Reused", icon: Copy, tile: "bg-expense-soft text-expense", count: "text-expense", bar: "bg-expense-fill", legend: "{count} reused" },
  { issue: "weak", title: "Weak password", why: "Short or easy to guess. Use Generate when you change it.", tag: "Weak", icon: TriangleAlert, tile: "bg-pillar-loans-soft text-pillar-loans", count: "text-pillar-loans", bar: "bg-pillar-loans", legend: "{count} weak" },
  { issue: "old", title: "Not changed for over a year", why: "Old passwords are more likely to have leaked somewhere. Bank and email logins matter most.", tag: "", icon: Clock, tile: "bg-warning-soft text-warning", count: "text-warning", bar: "bg-warning-fill", legend: "{count} older than a year" },
];

// The board's security checkup: how many logins need attention, then the
// reused, weak and year-old ones, each with Change and (for an old one)
// It's fine. It never shows a password.
export function VaultCheckup({ entries, checkup, busy, onBack, onChange, onFine }: VaultCheckupProps) {
  const { t } = useLocale();
  const now = new Date();
  const flagged = attentionIds(checkup).size;
  const fine = entries.length - flagged;
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const segments = [{ key: "fine", flex: fine, bar: "bg-emerald" }, ...GROUPS.map((group) => ({ key: group.issue, flex: checkup[group.issue].length, bar: group.bar }))].filter((segment) => segment.flex > 0);

  return (
    <div className="flex max-w-245 flex-col gap-4">
      <button type="button" onClick={onBack} className="flex w-fit items-center gap-2 text-body font-medium text-ink-2 hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" />
        {t("Password vault")}
      </button>

      <Card padding="none" className="flex items-center gap-6 p-6">
        <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-3xl [&_svg]:size-6", flagged ? "bg-warning-soft text-warning" : "bg-mint-50 text-emerald")}>{flagged ? <ShieldAlert aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-col gap-0.75">
            <h1 className="text-h2 font-semibold tracking-[-0.01em] text-ink">{flagged ? t("{count} of your {total} logins need attention", { count: flagged, total: entries.length }) : t("All {total} of your logins look fine", { total: entries.length })}</h1>
            <p className="text-body text-ink-muted">{t("Checked just now. Fixing these makes your other accounts much harder to break into.")}</p>
          </div>
          <div role="img" aria-label={t("{fine} fine, {count} need attention", { fine, count: flagged })} className="flex h-2.5 gap-0.75 overflow-hidden rounded-full">
            {segments.map((segment) => (
              <span key={segment.key} className={segment.bar} style={{ flex: segment.flex }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 text-small text-ink-2">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald" aria-hidden="true" />
              {t("{count} look fine", { count: fine })}
            </span>
            {GROUPS.map((group) => (
              <span key={group.issue} className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", group.bar)} aria-hidden="true" />
                {t(group.legend, { count: checkup[group.issue].length })}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {GROUPS.map((group) => {
        const items = checkup[group.issue].map((id) => byId.get(id)).filter((entry): entry is VaultEntrySummary => !!entry);
        if (items.length === 0) return null;
        return (
          <Card key={group.issue} padding="none" className="overflow-hidden">
            <div className="flex items-start gap-3 border-b border-divider px-5 py-4">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md [&_svg]:size-4", group.tile)}>
                <group.icon aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-0.5">
                <h2 className="text-title font-semibold text-ink">
                  {t(group.title)} <span className={group.count}>· {items.length}</span>
                </h2>
                <span className="text-small leading-normal text-ink-muted">{t(group.why)}</span>
              </div>
            </div>
            {items.map((entry) => {
              const months = monthsSince(entry.passwordChangedAt, now);
              return (
                <div key={entry.id} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-b-0">
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md text-body font-bold", SOFT_TONE[VAULT_CATEGORY_TONE[entry.category]])}>{avatarLetter(entry.title)}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="truncate text-body font-semibold text-ink">{entry.title}</span>
                    {entry.usernameOrEmail && <span className="truncate text-small text-ink-muted">{entry.usernameOrEmail}</span>}
                  </span>
                  <Chip tone={group.issue === "reused" ? "expense" : group.issue === "weak" ? "loans" : "warning"} size="sm">
                    {group.issue === "old" ? t(months === 1 ? "{count} month" : "{count} months", { count: months }) : t(group.tag)}
                  </Chip>
                  {group.issue === "old" && (
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => onFine(entry)} className="h-8.5 px-3 text-small">
                      {t("It's fine")}
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => onChange(entry)} className="h-8.5 px-3 text-small">
                    {t("Change")}
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              );
            })}
          </Card>
        );
      })}

      <p className="flex gap-2 text-small leading-normal text-ink-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{t("Change opens the website so you can set a new password there, then opens this login so you can save it. The checkup never shows your passwords on this page.")}</span>
      </p>
    </div>
  );
}
