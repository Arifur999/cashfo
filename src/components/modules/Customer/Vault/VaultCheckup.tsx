"use client";

import { ChevronLeft, Clock, Copy, ExternalLink, Info, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import { SOFT_TONE } from "@/components/smartly/tones";
import type { VaultCheckup as Checkup, VaultEntrySummary } from "@/lib/customer/api";
import { monthsSince } from "@/lib/customer/date";
import { attentionIds, avatarLetter, checkupBreakdown, type VaultIssue } from "@/lib/customer/vaultDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { VAULT_CATEGORY_TONE } from "./vaultCategoryDisplay";

interface VaultCheckupProps {
  entries: VaultEntrySummary[];
  // Only the logins still listed (checkupFor in vaultDisplay.ts); null with
  // no findings on hand: a run on its way after a failure, or a failed one.
  checkup: Checkup | null;
  failed: boolean;
  // Try again: asks the checkup once more.
  onRetry: () => void;
  busy: boolean;
  onBack: () => void;
  // Opens the website (when there is one) and the login, to save the new
  // password.
  onChange: (entry: VaultEntrySummary) => void;
  onFine: (entry: VaultEntrySummary) => void;
}

// Each group's look and words, in the board's order: the tile and count
// ink, the row's chip, and the bar and legend.
const GROUPS: { issue: VaultIssue; title: string; why: string; tag: string; icon: typeof Copy; tile: string; ink: string; chip: string; bar: string; legend: string }[] = [
  { issue: "reused", title: "Same password on more than one site", why: "If one of these sites leaks it, the others are open too.", tag: "Reused", icon: Copy, tile: "bg-expense-soft", ink: "text-expense-fill", chip: "bg-expense-soft text-expense-fill", bar: "bg-expense-fill", legend: "{count} reused" },
  { issue: "weak", title: "Weak password", why: "Short or easy to guess. Use Generate when you change it.", tag: "Weak", icon: TriangleAlert, tile: "bg-orange-soft", ink: "text-orange", chip: "bg-orange-soft text-orange", bar: "bg-orange-fill", legend: "{count} weak" },
  { issue: "old", title: "Not changed for over a year", why: "Old passwords are more likely to have leaked somewhere. Bank and email logins matter most.", tag: "", icon: Clock, tile: "bg-warning-soft", ink: "text-warning", chip: "bg-warning-soft text-warning", bar: "bg-warning-fill", legend: "{count} older than a year" },
];

// The board's column of cards is at most 914px wide.
const COLUMN = "w-full max-w-[914px]";
// The row buttons: 34px, 44px under a finger.
const ROW_BUTTON = "h-8.5 px-3 text-[13px] font-semibold pointer-coarse:h-11";

// The security checkup (design VaultHealth): how many logins need
// attention, then the reused, weak and year-old ones, each with Change and
// (for an old one) It's fine. It never shows a password.
export function VaultCheckup({ entries, checkup, failed, onRetry, busy, onBack, onChange, onFine }: VaultCheckupProps) {
  const { t, fmt } = useLocale();
  const back = (
    <button type="button" onClick={onBack} className="-my-2 -ml-1 flex min-h-9 w-fit items-center gap-1.5 rounded-md px-1 text-[13.5px] leading-[normal] font-medium text-ink-2 hover:text-ink pointer-coarse:min-h-11">
      <ChevronLeft className="size-4" aria-hidden="true" />
      {t("Password Manager")}
    </button>
  );

  // With no answer on hand the step stays open and says why, never "fine".
  if (!checkup) {
    return (
      <div className="flex flex-col gap-4.5">
        {back}
        {failed ? (
          <ErrorState title={t("The security checkup couldn't run.")} onRetry={onRetry} />
        ) : (
          <Card padding="none" role="status" className={cn(COLUMN, "px-5 py-10 text-center text-small text-ink-muted")}>
            {t("Checking your logins…")}
          </Card>
        )}
      </div>
    );
  }

  const now = new Date();
  const count = (value: number) => formatCount(value, fmt);
  const flagged = attentionIds(checkup).size;
  // The bar counts each login once, by its worst issue, so it adds up to
  // the logins there are. The legend counts a login under every issue it
  // has, as the groups below and the vault's summary do, so all three agree.
  const tally = checkupBreakdown(entries, checkup);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const segments = [{ key: "fine", flex: tally.fine, bar: "bg-emerald" }, ...GROUPS.map((group) => ({ key: group.issue, flex: tally[group.issue], bar: group.bar }))].filter((segment) => segment.flex > 0);
  const headline = flagged
    ? t(flagged === 1 ? "{count} of your {total} logins needs attention" : "{count} of your {total} logins need attention", { count: count(flagged), total: count(entries.length) })
    : entries.length === 1
      ? t("Your login looks fine")
      : t("All {total} logins look fine", { total: count(entries.length) });
  // "Home Wi-Fi's username · 8 characters, numbers only" under a weak login.
  const weakWhy = (id: string) => {
    const detail = checkup.weakDetails?.[id];
    if (!detail) return null;
    const length = t(detail.length === 1 ? "{count} character" : "{count} characters", { count: count(detail.length) });
    return detail.digitsOnly ? t("{length}, numbers only", { length }) : length;
  };

  return (
    <div className="flex flex-col gap-4.5">
      {back}

      <Card padding="none" className={cn(COLUMN, "flex items-center gap-5 px-6 py-5.5")}>
        <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-[14px] [&_svg]:size-6.5", flagged ? "bg-warning-soft text-warning" : "bg-income-soft text-emerald")}>{flagged ? <ShieldAlert aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 leading-[normal]">
          {/* Under the page's own h1. */}
          <h2 className="text-[22px] font-semibold text-ink">{headline}</h2>
          <p className="text-[13.5px] text-ink-2">{flagged ? t("Checked just now. Fixing these makes your other accounts much harder to break into.") : t("Checked just now. No reused, weak or old passwords.")}</p>
          <div role="img" aria-label={t("{fine} fine, {count} need attention", { fine: count(tally.fine), count: count(flagged) })} className="mt-1 flex h-2 gap-0.75">
            {segments.map((segment) => (
              <span key={segment.key} className={cn("rounded-full", segment.bar)} style={{ flex: segment.flex }} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-2">
            <span className="flex items-center gap-1.5">
              <span className="size-1.75 rounded-full bg-emerald" aria-hidden="true" />
              {t(tally.fine === 1 ? "{count} looks fine" : "{count} look fine", { count: count(tally.fine) })}
            </span>
            {GROUPS.filter((group) => checkup[group.issue].length > 0).map((group) => (
              <span key={group.issue} className="flex items-center gap-1.5">
                <span className={cn("size-1.75 rounded-full", group.bar)} aria-hidden="true" />
                {t(group.legend, { count: count(checkup[group.issue].length) })}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {flagged === 0 && (
        <section className={cn(COLUMN, "flex flex-col items-center gap-2 rounded-card border border-emerald-line bg-surface p-8 text-center leading-[normal]")}>
          <h3 className="text-[15px] font-semibold text-brand-ink">{t("Nothing to fix right now")}</h3>
          <p className="text-[13px] text-ink-2">{t("We'll point out new problems here when they come up.")}</p>
          <Button onClick={onBack} className="mt-1.5 h-9.5 px-4 text-[13.5px]">
            {t("Back to your logins")}
          </Button>
        </section>
      )}

      {GROUPS.map((group) => {
        const items = checkup[group.issue].map((id) => byId.get(id)).filter((entry): entry is VaultEntrySummary => !!entry);
        if (items.length === 0) return null;
        return (
          <Card key={group.issue} padding="none" className={cn(COLUMN, "overflow-hidden leading-[normal]")}>
            <div className="flex gap-3 border-b border-page px-5 py-4">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[9px] [&_svg]:size-3.75", group.tile, group.ink)}>
                <group.icon aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-0.5">
                <h3 className="text-[15px] font-semibold text-ink">
                  {t(group.title)} <span className={group.ink}>· {count(items.length)}</span>
                </h3>
                <span className="text-[13px] text-ink-muted">{t(group.why)}</span>
              </div>
            </div>
            {items.map((entry) => {
              const months = monthsSince(entry.passwordChangedAt, now);
              const why = group.issue === "weak" ? weakWhy(entry.id) : null;
              const sub = [entry.usernameOrEmail, why].filter(Boolean).join(" · ");
              return (
                <div key={entry.id} className="flex flex-wrap items-center gap-3 border-b border-page px-5 py-2.5 last:border-b-0">
                  <span aria-hidden="true" className={cn("flex size-8 shrink-0 items-center justify-center rounded-[9px] text-body font-bold", SOFT_TONE[VAULT_CATEGORY_TONE[entry.category]])}>
                    {avatarLetter(entry.title)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="truncate text-body font-semibold text-ink">{entry.title}</span>
                    {sub && <span className="truncate text-[12.5px] text-ink-muted">{sub}</span>}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap", group.chip)}>
                    {group.issue === "old" ? t(months === 1 ? "{count} month" : "{count} months", { count: count(months) }) : t(group.tag)}
                  </span>
                  {group.issue === "old" && (
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => onFine(entry)} className={cn(ROW_BUTTON, "text-ink-2")}>
                      {t("It's fine")}
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => onChange(entry)} className={ROW_BUTTON}>
                    {t("Change")}
                    <ExternalLink className="size-3.25 text-ink-soft" aria-hidden="true" />
                  </Button>
                </div>
              );
            })}
          </Card>
        );
      })}

      <p className={cn(COLUMN, "flex gap-2 text-[12.5px] leading-normal text-ink-muted")}>
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>{t("Change opens the website so you can set a new password there, then opens this login so you can save it. The checkup never shows your passwords on this page.")}</span>
      </p>
    </div>
  );
}
