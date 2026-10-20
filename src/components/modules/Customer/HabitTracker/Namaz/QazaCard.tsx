"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { QazaSummary } from "@/lib/customer/api";
import { formatDate } from "@/lib/customer/date";
import { logQazaAction, removeQazaAction, setQazaSinceAction } from "@/lib/customer/habitsActions";
import { PRAYERS } from "@/lib/customer/namazDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface QazaCardProps {
  // null when the summary could not be read.
  qaza: QazaSummary | null;
  today: string;
}

const day = (key: string, pattern = "d MMM") => formatDate(`${key}T00:00:00.000Z`, pattern);

// Qaza to make up: what is still owed, by prayer, against what was missed
// since the counting day and what was made up; "I prayed a qaza" logs one.
export function QazaCard({ qaza: serverQaza, today }: QazaCardProps) {
  const { t } = useLocale();
  const [qaza, setQaza] = useState(serverQaza);
  const [prevServer, setPrevServer] = useState(serverQaza);
  if (serverQaza !== prevServer) {
    setPrevServer(serverQaza);
    setQaza(serverQaza);
  }
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function log(prayer: string) {
    startTransition(async () => {
      const result = await logQazaAction(prayer);
      if (result.success && result.data) {
        setQaza(result.data);
        toast.success(t("{prayer} qaza saved", { prayer: t(prayer) }));
      } else {
        toast.error(result.message ?? t("Failed to save the qaza"));
      }
    });
  }

  if (!qaza) {
    return (
      <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
        <h2 className="text-title font-semibold text-ink">{t("Qaza to make up")}</h2>
        <p className="text-small text-ink-muted">{t("Couldn't load your qaza just now. Refresh to try again.")}</p>
      </Card>
    );
  }

  const missed = Object.values(qaza.missed).reduce((sum, n) => sum + n, 0);
  const madeUp = Object.values(qaza.madeUp).reduce((sum, n) => sum + n, 0);
  const share = missed > 0 ? Math.min(100, Math.round((madeUp / missed) * 100)) : 0;

  return (
    <Card padding="none" className="flex flex-col gap-3 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-title font-semibold text-ink">{t("Qaza to make up")}</h2>
        <span className="text-caption text-ink-muted">{t("Counting from {date}", { date: day(qaza.since) })}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("text-h1 tabular-nums", qaza.totalLeft > 0 ? "text-warning" : "text-income")}>{qaza.totalLeft}</span>
        <span className="text-body text-ink-2">{t(qaza.totalLeft === 1 ? "prayer left" : "prayers left")}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {PRAYERS.map((prayer) => (
          <span key={prayer} className={cn("flex flex-col items-center gap-0.5 rounded-md border py-2", qaza.left[prayer] > 0 ? "border-warning/30 bg-warning-soft text-warning" : "border-line bg-strip text-ink-muted")}>
            <span className="text-title font-bold tabular-nums">{qaza.left[prayer] ?? 0}</span>
            <span className="text-caption">{t(prayer)}</span>
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-small text-ink-2">
          <span>{t("{count} missed since {date}", { count: missed, date: day(qaza.since) })}</span>
          <span className="font-semibold text-ink">{t("{count} made up", { count: madeUp })}</span>
        </div>
        <span role="progressbar" aria-label={t("Qaza made up")} aria-valuenow={share} aria-valuemin={0} aria-valuemax={100} className="block h-1.5 overflow-hidden rounded-full bg-warning-soft">
          <span className="block h-full rounded-full bg-warning-fill" style={{ width: `${share}%` }} />
        </span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-divider pt-3">
        <button type="button" onClick={() => setHistoryOpen(true)} className="text-small font-semibold text-ink-2 hover:text-ink">
          {t("History")}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger disabled={isPending} className="flex h-8.5 items-center gap-2 rounded-md border border-warning-fill bg-warning-soft px-4 text-small font-semibold text-warning disabled:opacity-60">
            {isPending ? <Loader /> : <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />}
            {t("I prayed a qaza")}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-48 rounded-md border border-line bg-surface p-1.5 shadow-overlay ring-0">
            {PRAYERS.map((prayer) => (
              <DropdownMenuItem key={prayer} onSelect={() => log(prayer)} className="flex h-9 cursor-pointer items-center justify-between gap-3 rounded-sm px-3 text-small font-medium text-ink focus:bg-surface-sunken">
                {t(prayer)}
                <span className="text-caption text-ink-muted tabular-nums">{t("{count} left", { count: qaza.left[prayer] ?? 0 })}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <QazaHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} qaza={qaza} today={today} onChange={setQaza} />
    </Card>
  );
}

interface QazaHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  qaza: QazaSummary;
  today: string;
  onChange: (qaza: QazaSummary) => void;
}

// The qaza made up lately (each can be taken back) and the day counting
// starts from.
function QazaHistoryDialog({ open, onClose, qaza, today, onChange }: QazaHistoryDialogProps) {
  const { t } = useLocale();
  const [since, setSince] = useState(qaza.since);
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSince(qaza.since);
  }
  const [isPending, startTransition] = useTransition();

  function save(work: () => Promise<{ success: boolean; data?: QazaSummary; message?: string }>, done: string) {
    startTransition(async () => {
      const result = await work();
      if (result.success && result.data) {
        onChange(result.data);
        toast.success(done);
      } else {
        toast.error(result.message ?? t("Failed to update"));
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
      <AlertDialogContent className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0 sm:max-w-110">
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
          <AlertDialogTitle className="text-h3 text-ink">{t("Qaza history")}</AlertDialogTitle>
          <button type="button" onClick={onClose} aria-label={t("Close")} className="flex size-8.5 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken">
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>
        <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{t("Prayers missed on your Namaz sheets from this day on count as qaza.")}</AlertDialogDescription>
        <div className="flex items-end gap-3 px-6 py-4">
          <Field htmlFor="qz-since" label={<span className="text-body font-medium text-ink">{t("Counting from")}</span>} className="flex-1">
            <DayInput id="qz-since" value={since} onChange={setSince} max={today} />
          </Field>
          <Button type="button" variant="secondary" disabled={since === qaza.since || isPending} onClick={() => save(() => setQazaSinceAction(since), t("Counting day saved"))}>
            {t("Save")}
          </Button>
        </div>
        <div className="flex max-h-72 flex-col overflow-y-auto border-t border-line">
          {qaza.recent.length === 0 ? (
            <p className="px-6 py-6 text-center text-small text-ink-muted">{t("No qaza made up yet.")}</p>
          ) : (
            qaza.recent.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 border-b border-divider px-6 py-3 last:border-b-0">
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="text-body font-semibold text-ink">{entry.count > 1 ? `${t(entry.prayer)} × ${entry.count}` : t(entry.prayer)}</span>
                  <span className="text-caption text-ink-muted">{day(entry.date, "EEE d MMM yyyy")}</span>
                </span>
                <button type="button" disabled={isPending} onClick={() => save(() => removeQazaAction(entry.id), t("Qaza removed"))} aria-label={`${t("Remove")}: ${t(entry.prayer)}, ${day(entry.date)}`} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-expense-soft hover:text-expense disabled:opacity-50">
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
