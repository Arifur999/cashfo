"use client";

import { Lock } from "lucide-react";
import type { AiSection, AiSettings } from "@/lib/customer/aiInsightsTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../Shared/PopupDialog";
import { READ_OPTIONS } from "./AiTurnOn";

// The board's AI settings: what AI may read and the morning summary, each
// saved as it is switched; Turn off AI Insights at the foot.
export function AiSettingsDialog({ open, settings, busy, onClose, onChange, onTurnOff }: { open: boolean; settings: AiSettings; busy: boolean; onClose: () => void; onChange: (input: { reads?: AiSection[]; morning?: boolean }) => void; onTurnOff: () => void }) {
  const { t } = useLocale();
  const toggleRead = (value: AiSection) => onChange({ reads: settings.reads.includes(value) ? settings.reads.filter((row) => row !== value) : [...settings.reads, value] });
  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      width={500}
      title={t("AI settings")}
      className="leading-[normal]"
      bodyClassName="gap-4.5 py-5"
      footerClassName="flex-nowrap"
      footer={
        <>
          <button type="button" onClick={onTurnOff} disabled={busy} className="mr-auto text-[13.5px] font-semibold text-expense hover:underline disabled:opacity-50">
            {t("Turn off AI Insights")}
          </button>
          <button type="button" onClick={onClose} className="h-10.5 rounded-full bg-primary px-5 text-body font-semibold text-primary-foreground hover:bg-emerald-hover">
            {t("Done")}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-2.5">
        <span className="text-[11.5px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{t("What AI can read")}</span>
        {READ_OPTIONS.map((option) => (
          <Toggle key={option.value} label={t(option.label)} on={settings.reads.includes(option.value)} disabled={busy} onClick={() => toggleRead(option.value)} />
        ))}
        <span className="flex items-center gap-2 text-small text-ink-muted">
          <Lock className="size-3.5" aria-hidden="true" />
          {t("Password Manager is never read")}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 border-t border-line-card pt-4">
        <span className="text-[11.5px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{t("Updates")}</span>
        <Toggle label={t("Morning summary notification at 7:00 AM")} on={settings.morning} disabled={busy} onClick={() => onChange({ morning: !settings.morning })} />
      </div>
    </PopupDialog>
  );
}

function Toggle({ label, on, disabled, onClick }: { label: string; on: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onClick} disabled={disabled} className="flex items-center gap-2.5 text-left text-body text-ink disabled:opacity-60">
      <span className="flex-1">{label}</span>
      <span aria-hidden="true" className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-input")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[left]", on ? "left-4.5" : "left-0.5")} />
      </span>
    </button>
  );
}
