"use client";

import { ArrowRight, Check } from "lucide-react";
import { usePlanChip } from "@/components/modules/Customer/Providers/PlanProvider";
import type { BackupsPage, DataPrivacyPage } from "@/lib/customer/dataPrivacyTypes";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CARD } from "../boardUi";
import { fileSizeText } from "./dataFiles";

const PROMISES = ["We never sell your data or show you ads based on it.", "Your data is encrypted on the way to our servers, and your saved passwords on them.", "You can take it out or delete it at any time."];

// The SettingsData board's side column: the records at a glance, the room
// the backups take, and the promise.
export function DataSide({ data, backups }: { data: DataPrivacyPage; backups: BackupsPage | null }) {
  const { t, fmt } = useLocale();
  const plan = usePlanChip();
  const glance = [
    [data.glance.transactions, "Transactions"],
    [data.glance.accounts, "Accounts"],
    [data.glance.goals, "Savings goals"],
    [data.glance.loanContacts, "Loan contacts"],
    [data.glance.assets, "Assets"],
    [data.glance.groups, "Groups"],
    [data.glance.events, "Events"],
    [backups?.backups.length ?? 0, "Backups"],
  ] as const;
  const records = backups?.storage.records ?? 0;
  const kept = backups?.storage.backups ?? 0;
  const used = records + kept;
  const parts = [
    { label: "Records", bytes: records, color: "bg-meter-records" },
    { label: "Backups", bytes: kept, color: "bg-meter-backups" },
  ];

  return (
    <div className="flex flex-col gap-4 xl:sticky xl:top-4">
      <section aria-labelledby="sd-gl" className={cn(CARD, "flex flex-col gap-3 px-5 py-4.5")}>
        <h2 id="sd-gl" className="text-[16px] leading-[1.35] font-semibold text-ink">
          {t("Your data at a glance")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {glance.map(([count, label]) => (
            <div key={label} className="flex min-w-0 items-baseline gap-2 rounded-[12px] border border-line-card px-3 py-2.25">
              <span className="text-[17px] font-bold tracking-[-0.01em] text-ink tabular-nums">{formatCount(count, fmt)}</span>
              <span className="truncate text-[12px] text-ink-muted">{t(label)}</span>
            </div>
          ))}
        </div>
        <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("Counts update as you add things.")}</span>
      </section>

      <section aria-labelledby="sd-st" className={cn(CARD, "flex flex-col gap-2.5 px-5 py-4.5")}>
        <div className="flex items-baseline justify-between gap-2.5">
          <h2 id="sd-st" className="text-[16px] leading-[1.35] font-semibold text-ink">
            {t("Storage used")}
          </h2>
          <span className="inline-flex h-5 items-center rounded-full bg-mint-50 px-2 text-[11px] font-semibold text-primary">{plan.label}</span>
        </div>
        <span className="text-[18px] font-bold text-ink">{used > 0 ? fileSizeText(used, fmt) : "—"}</span>
        <div role="img" aria-label={t("Storage used")} className="flex h-2.5 overflow-hidden rounded-full bg-surface-sunken">
          {used > 0 && parts.map((part) => <span key={part.label} className={part.color} style={{ width: `${(part.bytes / used) * 100}%` }} />)}
        </div>
        <div className="mt-0.5 flex flex-col gap-1.5">
          {parts.map((part) => (
            <span key={part.label} className="flex items-center gap-2 text-[12.5px] text-ink-soft">
              <span aria-hidden="true" className={cn("size-2.25 shrink-0 rounded-[3px]", part.color)} />
              <span className="flex-1">{t(part.label)}</span>
              <span className="font-semibold tabular-nums">{part.bytes > 0 ? fileSizeText(part.bytes, fmt) : "—"}</span>
            </span>
          ))}
        </div>
      </section>

      <section aria-labelledby="sd-pp" className={cn(CARD, "flex flex-col gap-2 px-5 py-4")}>
        <h2 id="sd-pp" className="text-[16px] leading-[1.35] font-semibold text-ink">
          {t("Our promise")}
        </h2>
        {PROMISES.map((line) => (
          <span key={line} className="flex gap-2.25 text-[13px] leading-normal text-ink-2">
            <Check className="mt-0.75 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span>{t(line)}</span>
          </span>
        ))}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.25 text-small font-semibold text-emerald hover:underline">
          {t("Read the privacy policy")}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </a>
      </section>
    </div>
  );
}
