"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PageFrame from "@/components/smartly/PageFrame";
import StatePanel from "@/components/smartly/StatePanel";
import type { BackupsPage, DataPrivacyPage, ImportContext } from "@/lib/customer/dataPrivacyTypes";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SettingsBack } from "../SettingsBack";
import { BackupCard } from "./BackupCard";
import { DataSide } from "./DataSide";
import { ExportCard } from "./ExportCard";
import { ImportCard } from "./ImportCard";
import { ConnectedAppsCard, DeleteCard, PrivacyCard } from "./PrivacyCards";

interface DataPageClientProps {
  data: DataPrivacyPage | null;
  backups: BackupsPage | null;
  importContext: ImportContext | null;
  businessId: string | null;
  today: string;
  readOnly: boolean;
}

// The SettingsData board: take the records out, bring them in, keep
// backups, and choose who sees what; the records at a glance beside.
export function DataPageClient({ data, backups, importContext, businessId, today, readOnly }: DataPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  // Bumped by "Download my data first" in Delete my account.
  const [exportSignal, setExportSignal] = useState(0);

  if (!data) {
    return (
      <PageFrame className="gap-5 leading-[normal]">
        <h1 className="text-page-title text-ink">{t("Data & privacy")}</h1>
        <StatePanel icon={<ShieldCheck />} tone="warning" title={t("Couldn't load your data settings.")} description={t("Check your connection and try again.")} />
      </PageFrame>
    );
  }

  return (
    <PageFrame className="gap-5.5 leading-[normal]">
      <div className="flex flex-col gap-1">
        <SettingsBack />
        <h1 className="text-[26px] leading-[1.3] font-semibold tracking-[-0.02em] text-ink">{t("Data & privacy")}</h1>
        <p className="text-body text-ink-muted">{t("Take your data out, bring it in, keep backups and choose who sees what.")}</p>
      </div>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-4.5">
          <ExportCard today={today} startSignal={exportSignal} />
          <ImportCard businessId={businessId} context={importContext} today={today} readOnly={readOnly} onImported={() => router.refresh()} />
          <BackupCard initial={backups} readOnly={readOnly} />
          <PrivacyCard initial={data} readOnly={readOnly} />
          <ConnectedAppsCard />
          <DeleteCard readOnly={readOnly} onDownload={() => setExportSignal((n) => n + 1)} />
        </div>
        <DataSide data={data} backups={backups} />
      </div>
    </PageFrame>
  );
}
