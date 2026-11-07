"use client";

import { RotateCw, Settings, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import PageFrame from "@/components/smartly/PageFrame";
import StatePanel from "@/components/smartly/StatePanel";
import type { AiWords } from "@/lib/customer/aiInsightsDisplay";
import { saveAiSettingsAction } from "@/lib/customer/aiInsightsActions";
import type { AiInsightsPage, AiSection } from "@/lib/customer/aiInsightsTypes";
import { formatCurrency } from "@/lib/customer/currency";
import { formatDate, formatDay } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { AiReportView } from "./AiReportView";
import { AiSettingsDialog } from "./AiSettingsDialog";
import { AiTurnOn } from "./AiTurnOn";
import { AskAi } from "./AskAi";

interface AiInsightsPageClientProps {
  businessId: string;
  page: AiInsightsPage | null;
  canSee: boolean;
  currency: string;
  readOnly: boolean;
}

const doneKey = (businessId: string) => `smartly-ai-done:${businessId}`;

// The AIInsights boards: turned off, the invitation to turn it on
// (AIInsightsOff); on, last month's report with Ask AI beside it, and AI
// settings. Ticks on What to do next are this browser's own (their keys
// carry the month, so they start fresh each month).
export function AiInsightsPageClient({ businessId, page, canSee, currency, readOnly }: AiInsightsPageClientProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(page ? { on: page.on, reads: page.reads, morning: page.morning } : null);
  const [done, setDone] = useState<Set<string>>(new Set());

  // A fresh read from the server (another workspace, a refresh).
  const [prevPage, setPrevPage] = useState(page);
  if (page !== prevPage) {
    setPrevPage(page);
    setSettings(page ? { on: page.on, reads: page.reads, morning: page.morning } : null);
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(doneKey(businessId)) ?? "[]") as unknown;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the ticks live in this browser, read after the first paint
      if (Array.isArray(saved)) setDone(new Set(saved.filter((key): key is string => typeof key === "string")));
    } catch {
      // No storage (a private window): the ticks just aren't kept.
    }
  }, [businessId]);

  const words: AiWords = useMemo(
    () => ({
      t,
      money: (paisa: number) => formatCurrency(paisa / 100, currency, fmt),
      month: (key: string) => formatDay(`${key}-01`, "MMMM", fmt),
      day: (day: string) => formatDay(day, "d MMMM", fmt),
      count: (value: number) => formatCount(value, fmt),
    }),
    [t, fmt, currency],
  );

  async function save(input: { on?: boolean; reads?: AiSection[]; morning?: boolean }, after?: string) {
    if (!settings || busy) return;
    const before = settings;
    setSettings({ ...settings, ...input });
    setBusy(true);
    const result = await saveAiSettingsAction(input).catch(() => null);
    setBusy(false);
    if (!result?.success) {
      setSettings(before);
      toast.error(t(result?.message ?? "Couldn't save your AI settings."));
      return;
    }
    if (after) toast.success(t(after));
    if (input.on !== undefined || input.reads !== undefined) startRefresh(() => router.refresh());
  }

  function toggleDone(key: string) {
    const next = new Set(done);
    if (next.has(key)) next.delete(key);
    else {
      next.add(key);
      toast.success(t("Nice, one less thing to worry about"));
    }
    setDone(next);
    try {
      window.localStorage.setItem(doneKey(businessId), JSON.stringify([...next]));
    } catch {
      // Not kept in a private window; the tick still shows.
    }
  }

  const report = settings?.on ? page?.report : null;
  const header = (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-page-title text-ink">{t("AI Insights")}</h1>
          <span className="rounded-full bg-forest px-2.25 py-0.5 text-[11.5px] font-semibold text-white">{t("Pro")}</span>
        </div>
        <p className="text-body text-ink-muted">{t("Advice in plain words, worked out from your own numbers.")}</p>
      </div>
      {report && (
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] text-ink-muted">{t("Updated today at {time}", { time: formatDate(report.generatedAt, "h:mm a", "—", fmt) })}</span>
          <button type="button" onClick={() => setSettingsOpen(true)} disabled={readOnly} className="flex h-10 items-center gap-1.75 rounded-full border border-input bg-surface px-3.5 text-[13.5px] font-semibold text-ink hover:bg-surface-sunken disabled:opacity-50">
            <Settings className="size-4 text-ink-soft" aria-hidden="true" />
            {t("AI settings")}
          </button>
        </div>
      )}
    </div>
  );

  if (!canSee || !page || !settings) {
    return (
      <PageFrame className="gap-5 leading-[normal]">
        {header}
        {!canSee ? (
          <StatePanel icon={<Sparkles />} title={t("Only the owner or an accountant sees AI Insights")} description={t("AI Insights reads this workspace's money. Ask its owner, or open your own workspace.")} />
        ) : (
          <StatePanel
            icon={<Sparkles />}
            tone="warning"
            title={t("Couldn't load AI Insights.")}
            description={t("Check your connection and try again.")}
            action={
              <Button variant="secondary" disabled={isRefreshing} onClick={() => startRefresh(() => router.refresh())}>
                <RotateCw />
                {t("Try again")}
              </Button>
            }
          />
        )}
      </PageFrame>
    );
  }

  return (
    <PageFrame className="gap-5 leading-[normal]">
      {header}
      {!settings.on ? (
        <AiTurnOn reads={settings.reads} busy={busy || isRefreshing} readOnly={readOnly} onTurnOn={(reads) => void save({ on: true, reads }, "AI Insights is on")} />
      ) : report ? (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
          <AiReportView report={report} words={words} done={done} onToggle={toggleDone} />
          <AskAi report={report} words={words} chat={page.chat} />
        </div>
      ) : (
        <StatePanel icon={<Sparkles />} title={t("Working out your insights...")} description={t("This takes a moment the first time.")} />
      )}
      <AiSettingsDialog
        open={settingsOpen}
        settings={settings}
        busy={busy}
        onClose={() => setSettingsOpen(false)}
        onChange={(input) => void save(input)}
        onTurnOff={() => {
          setSettingsOpen(false);
          void save({ on: false }, "AI Insights is off");
        }}
      />
    </PageFrame>
  );
}
