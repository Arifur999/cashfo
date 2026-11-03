"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import ErrorState from "@/components/smartly/ErrorState";
import DayInput from "@/components/smartly/form/DayInput";
import Field from "@/components/smartly/form/Field";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { QazaSummary } from "@/lib/customer/api";
import { actionError, dayText } from "@/lib/customer/habitDisplay";
import { logQazaAction, removeQazaAction, setQazaSinceAction } from "@/lib/customer/habitsActions";
import { PRAYERS } from "@/lib/customer/namazDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CloseButton } from "../Tracker/PanelParts";

interface QazaCardProps {
  // null when the summary could not be read.
  qaza: QazaSummary | null;
  today: string;
}

// Qaza to make up: what is still owed, by prayer, against what was missed
// since the counting day and what was made up; "I prayed a qaza" logs one.
export function QazaCard({ qaza: serverQaza, today }: QazaCardProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [qaza, setQaza] = useState(serverQaza);
  const [prevServer, setPrevServer] = useState(serverQaza);
  if (serverQaza !== prevServer) {
    setPrevServer(serverQaza);
    setQaza(serverQaza);
  }
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isRetrying, startRetry] = useTransition();
  const count = (n: number) => formatCount(n, fmt);

  function log(prayer: string) {
    startTransition(async () => {
      const result = await logQazaAction(prayer);
      if (result.success && result.data) {
        setQaza(result.data);
        toast.success(t("{prayer} qaza saved", { prayer: t(prayer) }));
      } else {
        toast.error(actionError(result.message, "Failed to save the qaza", t, fmt));
      }
    });
  }

  if (!qaza) {
    return (
      <Card padding="none" className="flex flex-col gap-3 rounded-md px-5 py-4">
        <h2 className="text-title font-semibold text-ink">{t("Qaza to make up")}</h2>
        <ErrorState bordered={false} title={t("Couldn't load your qaza just now")} onRetry={isRetrying ? undefined : () => startRetry(() => router.refresh())} className="p-2" />
      </Card>
    );
  }

  const missed = Object.values(qaza.missed).reduce((sum, n) => sum + n, 0);
  const madeUp = Object.values(qaza.madeUp).reduce((sum, n) => sum + n, 0);
  const share = missed > 0 ? Math.min(100, Math.round((madeUp / missed) * 100)) : 0;
  const since = dayText(qaza.since, fmt, "dayMonth");

  return (
    <Card padding="none" className="flex min-w-0 flex-col gap-2.5 rounded-[14px] px-4.5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 className="text-[16px] font-semibold text-ink">{t("Qaza to make up")}</h2>
        <button type="button" onClick={() => setHistoryOpen(true)} className="flex min-h-8 items-center rounded-sm text-small font-semibold text-emerald hover:underline pointer-coarse:min-h-11">
          {t("History")}
        </button>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={cn("text-[30px] leading-[normal] font-bold tabular-nums", qaza.totalLeft > 0 ? "text-warning-ink" : "text-income")}>{count(qaza.totalLeft)}</span>
        <span className="text-body text-ink-soft">
          {t(qaza.totalLeft === 1 ? "prayer left" : "prayers left")} · {t("{count} made up", { count: count(madeUp) })}
        </span>
      </div>
      <span className="text-[12.5px] text-ink-muted">{t("Prayed one? Tap its box to take 1 off.")}</span>
      <div className="grid grid-cols-5 gap-1.5">
        {PRAYERS.map((prayer) => {
          const left = qaza.left[prayer] ?? 0;
          return (
            <button
              key={prayer}
              type="button"
              disabled={left === 0 || isPending}
              onClick={() => log(prayer)}
              title={t("I prayed a {prayer} qaza", { prayer: t(prayer) })}
              aria-label={t("I prayed a {prayer} qaza. {count} left.", { prayer: t(prayer), count: count(left) })}
              className={cn("flex min-w-0 flex-col items-center gap-px rounded-[9px] border py-1.75 transition-colors disabled:cursor-default", left > 0 ? "border-warning-line bg-warning-50 text-warning-ink enabled:hover:bg-warning-soft" : "border-income/30 bg-income-soft text-income")}
            >
              <span className="text-[17px] leading-[normal] font-bold tabular-nums">{count(left)}</span>
              <span className="max-w-full truncate px-0.5 text-[11.5px]">{t(prayer)}</span>
              <span className={cn("text-[10.5px] font-bold", left === 0 && "invisible")}>{isPending ? <Loader /> : "−1"}</span>
            </button>
          );
        })}
      </div>
      <span className="text-caption text-ink-muted">{t("{count} missed since {date}", { count: count(missed), date: since })}</span>
      <span role="progressbar" aria-label={t("Qaza made up")} aria-valuenow={share} aria-valuemin={0} aria-valuemax={100} className="mt-auto block h-1.5 overflow-hidden rounded-full bg-warning-soft">
        <span className="block h-full rounded-full bg-warning-fill" style={{ width: `${share}%` }} />
      </span>
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

// The qaza made up lately (each can be taken back, after a check) and the
// day counting starts from.
function QazaHistoryDialog({ open, onClose, qaza, today, onChange }: QazaHistoryDialogProps) {
  const { t, fmt } = useLocale();
  const [since, setSince] = useState(qaza.since);
  const [removing, setRemoving] = useState<QazaSummary["recent"][number] | null>(null);
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSince(qaza.since);
  }
  const [isPending, startTransition] = useTransition();
  const entryName = (entry: QazaSummary["recent"][number]) => (entry.count > 1 ? t("{prayer} × {count}", { prayer: t(entry.prayer), count: formatCount(entry.count, fmt) }) : t(entry.prayer));

  function save(work: () => Promise<{ success: boolean; data?: QazaSummary; message?: string }>, done: string, after?: () => void) {
    startTransition(async () => {
      const result = await work();
      if (result.success && result.data) {
        onChange(result.data);
        toast.success(done);
        after?.();
      } else {
        toast.error(actionError(result.message, "Failed to update", t, fmt));
      }
    });
  }

  return (
    <>
      <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onClose()}>
        <AlertDialogContent className="w-110 max-w-[calc(100vw-32px)] gap-0 overflow-hidden rounded-xl border border-line bg-surface p-0 shadow-overlay ring-0 sm:max-w-110">
          <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
            <AlertDialogTitle className="text-h3 text-ink">{t("Qaza history")}</AlertDialogTitle>
            <CloseButton onClick={onClose} label={t("Close")} />
          </div>
          <AlertDialogDescription className="px-6 pt-4 text-small text-ink-muted">{t("Prayers missed on your Namaz sheets from this day on count as qaza.")}</AlertDialogDescription>
          <div className="flex flex-wrap items-end gap-3 px-6 py-4">
            <Field htmlFor="qz-since" label={<span className="text-body font-medium text-ink">{t("Counting from")}</span>} className="min-w-40 flex-1">
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
                    <span className="text-body font-semibold text-ink">{entryName(entry)}</span>
                    <span className="text-caption text-ink-muted">{dayText(entry.date, fmt, "shortYear")}</span>
                  </span>
                  <button type="button" disabled={isPending} onClick={() => setRemoving(entry)} aria-label={t("Remove {name}, {date}", { name: entryName(entry), date: dayText(entry.date, fmt, "dayMonth") })} className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-expense-soft hover:text-expense disabled:opacity-50 pointer-coarse:size-11">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <ConfirmDialog
        open={removing !== null}
        onClose={() => !isPending && setRemoving(null)}
        onConfirm={() => removing && save(() => removeQazaAction(removing.id), t("Qaza removed"), () => setRemoving(null))}
        isPending={isPending}
        title={t("Take back this qaza?")}
        description={removing ? t("{name} on {date} goes back onto what you owe.", { name: entryName(removing), date: dayText(removing.date, fmt, "dayMonthYear") }) : ""}
        confirmLabel={t("Take it back")}
      />
    </>
  );
}
