"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import { saveAiSettingsAction } from "@/lib/customer/aiInsightsActions";
import type { AiSection } from "@/lib/customer/aiInsightsTypes";
import { savePrivacyAction } from "@/lib/customer/dataPrivacyActions";
import type { DataPrivacyPage, PrivacySwitches } from "@/lib/customer/dataPrivacyTypes";
import { DELETION_GRACE_DAYS } from "@/lib/customer/securityDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { DeleteAccountDialog } from "../DeleteAccountDialog";
import { CARD, CheckChip, SmallSwitch } from "../boardUi";

const AI_PARTS: { key: AiSection; label: string }[] = [
  { key: "TRANSACTIONS", label: "Income & Expense" },
  { key: "BUDGET", label: "Budget" },
  { key: "SAVINGS", label: "Savings goals" },
  { key: "LOANS", label: "Loans" },
  { key: "ASSETS", label: "Assets" },
  { key: "GROUPS", label: "Group Expense" },
];
const SWITCHES: { key: keyof PrivacySwitches; title: string; body: string }[] = [
  { key: "shareUsage", title: "Share anonymous usage to improve the app", body: "Which pages you open and what breaks. Never amounts or names." },
  { key: "showNameInGroups", title: "Show my name to group members", body: "When off, members see your initials only." },
  { key: "marketingEmails", title: "Marketing emails", body: "Offers and discounts on Pro, with news and tips. About once a month." },
];

function Head({ id, title, sub }: { id: string; title: string; sub: string }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-0.75 px-5.5 pt-4.5 pb-3.5">
      <h2 id={id} className="text-[16px] leading-[1.35] font-semibold text-ink">
        {t(title)}
      </h2>
      <p className="text-small leading-normal text-ink-muted">{t(sub)}</p>
    </div>
  );
}

// The SettingsData board's Privacy card: what AI Insights may read, and
// usage, the name in groups and marketing emails; each saves as switched.
export function PrivacyCard({ initial, readOnly }: { initial: DataPrivacyPage; readOnly: boolean }) {
  const { t } = useLocale();
  const [ai, setAi] = useState(initial.ai);
  const [privacy, setPrivacy] = useState(initial.privacy);
  const [busy, setBusy] = useState(false);

  async function saveAi(change: { on?: boolean; reads?: AiSection[] }) {
    if (busy || readOnly) return;
    setBusy(true);
    const result = await saveAiSettingsAction(change).catch(() => null);
    setBusy(false);
    if (!result?.success || !result.data) return void toast.error(t(result?.message ?? "Couldn't save your AI settings."));
    setAi({ on: result.data.on, reads: result.data.reads });
    toast.success(t("Saved"));
  }

  async function savePrivacy(change: Partial<PrivacySwitches>) {
    if (busy || readOnly) return;
    setBusy(true);
    const result = await savePrivacyAction(change).catch(() => null);
    setBusy(false);
    if (!result?.success || !result.data) return void toast.error(t(result?.message ?? "Couldn't save your privacy settings."));
    setPrivacy(result.data.privacy);
    toast.success(t("Saved"));
  }

  return (
    <section aria-labelledby="sd-pr" className={CARD}>
      <Head id="sd-pr" title="Privacy" sub="Your money data is yours. Choose what Smartly and others may see." />
      <div className="flex flex-col gap-2.5 border-t border-divider px-5.5 py-3.25">
        <div className="flex items-center gap-4.5">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-body font-medium text-ink">{t("AI Insights can read my data")}</span>
            <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("Used only to write your tips. Never shared or sold. Pick the sections below.")}</span>
          </span>
          <SmallSwitch on={ai.on} label={t("AI Insights can read my data")} disabled={busy || readOnly} onClick={() => void saveAi({ on: !ai.on })} />
        </div>
        <div role="group" aria-label={t("Sections AI Insights can read")} className={cn("flex flex-wrap gap-2", !ai.on && "opacity-50")}>
          {AI_PARTS.map((part) => {
            const on = ai.reads.includes(part.key);
            return <CheckChip key={part.key} on={on} label={t(part.label)} disabled={!ai.on || busy || readOnly} onClick={() => void saveAi({ reads: on ? ai.reads.filter((key) => key !== part.key) : [...ai.reads, part.key] })} />;
          })}
        </div>
      </div>
      {SWITCHES.map((row) => (
        <div key={row.key} className="flex items-center gap-4.5 border-t border-divider px-5.5 py-3.25">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-body font-medium text-ink">{t(row.title)}</span>
            <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t(row.body)}</span>
          </span>
          <SmallSwitch on={privacy[row.key]} label={t(row.title)} disabled={busy || readOnly} onClick={() => void savePrivacy({ [row.key]: !privacy[row.key] })} />
        </div>
      ))}
    </section>
  );
}

function DriveMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path d="M8.2 3h7.6l6.2 10.7-3.8 6.6L12 9.6z" fill="#FFBA00" />
      <path d="M8.2 3 2 13.7l3.8 6.6L12 9.6z" fill="#0F9D58" />
      <path d="M5.8 20.3h12.4l3.8-6.6H9.6z" fill="#4285F4" />
    </svg>
  );
}

// The SettingsData board's Connected apps: Google Drive for backups and the
// bKash statement import, both on the way.
export function ConnectedAppsCard() {
  const { t } = useLocale();
  const apps = [
    { key: "drive", mark: <DriveMark />, tile: "border border-line bg-surface", title: "Google Drive for backups", body: "Keep a copy of every backup in your own Drive." },
    { key: "bkash", mark: <span className="text-[12px] font-bold">b</span>, tile: "bg-gateway-bkash text-white", title: "bKash statement import", body: "Bring in your bKash payments without a file." },
  ];
  return (
    <section aria-labelledby="sd-ca" className={CARD}>
      <Head id="sd-ca" title="Connected apps" sub="Other services that work with your Smartly account." />
      {apps.map((app) => (
        <div key={app.key} className="flex items-center gap-4.5 border-t border-divider px-5.5 py-3.25 opacity-75">
          <span className={cn("flex size-9.5 shrink-0 items-center justify-center rounded-[11px]", app.tile)}>{app.mark}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-2 text-body font-medium text-ink">
              {t(app.title)}
              <span className="inline-flex h-5 items-center rounded-full bg-surface-sunken px-2 text-[11px] font-semibold text-ink-soft">{t("Coming soon")}</span>
            </span>
            <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t(app.body)}</span>
          </span>
          <Button variant="secondary" size="sm" className="h-8.5 px-3.5 text-small" disabled>
            {t("Connect")}
          </Button>
        </div>
      ))}
    </section>
  );
}

// The SettingsData board's danger zone: Delete my account, with the
// account's own dialog (30 days to change your mind).
export function DeleteCard({ readOnly, onDownload }: { readOnly: boolean; onDownload: () => void }) {
  const { t, fmt } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="sd-dz" className={cn(CARD, "flex flex-wrap items-center gap-4 border-expense/30 px-5.5 py-4.5")}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-expense-soft text-expense">
        <Trash2 className="size-4.5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.75">
        <h2 id="sd-dz" className="text-[16px] leading-[1.35] font-semibold text-expense">
          {t("Delete my account")}
        </h2>
        <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("Removes your account and everything in it. You have {days} days to change your mind.", { days: formatCount(DELETION_GRACE_DAYS, fmt) })}</span>
      </span>
      <Button variant="secondary" size="sm" className="h-9.5 border-expense/40 px-3.75 text-[13.5px] text-expense hover:bg-expense-soft" disabled={readOnly} onClick={() => setOpen(true)}>
        {t("Delete my account")}
      </Button>
      <DeleteAccountDialog
        open={open}
        onClose={() => setOpen(false)}
        onDownload={() => {
          setOpen(false);
          onDownload();
        }}
      />
    </section>
  );
}
