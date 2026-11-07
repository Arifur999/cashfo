"use client";

import { Database, RotateCw, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import { backUpNowAction, restoreBackupAction, saveBackupSettingsAction } from "@/lib/customer/dataPrivacyActions";
import type { BackupRow, BackupSettings, BackupsPage } from "@/lib/customer/dataPrivacyTypes";
import { formatDate } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { PopupDialog } from "../../Shared/PopupDialog";
import { BoardSegment, CARD, SELECT, SmallSwitch } from "../boardUi";
import { fileSizeText } from "./dataFiles";

const SHOWN = 3;
const KIND: Record<BackupRow["kind"], string> = { AUTO: "automatic", MANUAL: "made by you", BEFORE_RESTORE: "before a restore" };

// The SettingsData board's Backup and restore card: automatic copies at
// 2:00 at night (daily or weekly, the newest few kept), one made by hand,
// and any of them put back, with an undo.
export function BackupCard({ initial, readOnly }: { initial: BackupsPage | null; readOnly: boolean }) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [page, setPage] = useState(initial);
  const [seen, setSeen] = useState(initial);
  const [busy, setBusy] = useState<"save" | "backup" | "restore" | null>(null);
  const [all, setAll] = useState(false);
  const [asked, setAsked] = useState<BackupRow | null>(null);
  if (initial !== seen) {
    setSeen(initial);
    setPage(initial);
  }

  const day = (row: BackupRow) => formatDate(row.createdAt, "d MMMM yyyy", "—", fmt);
  const time = (row: BackupRow) => formatDate(row.createdAt, "HH:mm", "—", fmt);

  async function save(change: Partial<BackupSettings>) {
    if (busy || readOnly) return;
    setBusy("save");
    const result = await saveBackupSettingsAction(change).catch(() => null);
    setBusy(null);
    if (!result?.success || !result.data) return void toast.error(t(result?.message ?? "Couldn't save your backup settings."));
    setPage(result.data);
    toast.success(t("Saved"));
  }

  async function backUpNow() {
    if (busy || readOnly) return;
    setBusy("backup");
    const result = await backUpNowAction().catch(() => null);
    setBusy(null);
    if (!result?.success || !result.data) return void toast.error(t(result?.status === 429 ? "You just made a backup. Try again in a minute." : (result?.message ?? "Couldn't make a backup. Try again.")));
    setPage(result.data);
    router.refresh();
    toast.success(t("Backed up just now"));
  }

  async function restore(id: string, undo: boolean, takenOn?: string) {
    if (busy || readOnly) return;
    setBusy("restore");
    const result = await restoreBackupAction(id).catch(() => null);
    setBusy(null);
    setAsked(null);
    if (!result?.success || !result.data) return void toast.error(t(result?.status === 429 ? "You just restored a backup. Try again in a minute." : (result?.message ?? "Couldn't restore this backup. Nothing was changed.")));
    const done = result.data;
    router.refresh();
    if (undo) return void toast.success(t("Restore undone. Your data is as it was."));
    toast.success(t("Restored from {date}", { date: takenOn ?? "" }), { action: { label: t("Undo"), onClick: () => void restore(done.undoId, true) } });
    if (done.locked.length > 0) toast.warning(t("Left as they are, locked with a PIN: {names}", { names: done.locked.join(", ") }));
  }

  if (!page) {
    return (
      <section aria-labelledby="sd-bk" className={cn(CARD, "px-5.5 py-4.5")}>
        <h2 id="sd-bk" className="text-[16px] font-semibold text-ink">
          {t("Backup and restore")}
        </h2>
        <p className="mt-1 text-small text-ink-muted">{t("Couldn't load your backups. Check your connection and try again.")}</p>
      </section>
    );
  }
  const { settings, backups } = page;
  const shown = all ? backups : backups.slice(0, SHOWN);

  return (
    <section aria-labelledby="sd-bk" className={CARD}>
      <div className="flex flex-wrap items-start gap-4 px-5.5 pt-4.5 pb-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.75">
          <h2 id="sd-bk" className="text-[16px] leading-[1.35] font-semibold text-ink">
            {t("Backup and restore")}
          </h2>
          <p className="text-small leading-normal text-ink-muted">{t("Backups are kept safely in Smartly. Your money records are in them; Password Manager and the Habit Tracker are not.")}</p>
        </div>
        <Button size="sm" className="h-8.5 px-3.5 text-small" disabled={busy !== null || readOnly} onClick={() => void backUpNow()}>
          <RotateCw className={cn("size-3.75", busy === "backup" && "animate-spin")} aria-hidden="true" />
          {t(busy === "backup" ? "Backing up…" : "Back up now")}
        </Button>
      </div>
      <div className="flex items-center gap-4.5 border-t border-divider px-5.5 py-3.25">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-medium text-ink">{t("Automatic backup")}</span>
          <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("A full copy of your money records, made at 2:00 at night.")}</span>
        </span>
        <SmallSwitch on={settings.auto} label={t("Automatic backup")} disabled={busy !== null || readOnly} onClick={() => void save({ auto: !settings.auto })} />
      </div>
      <div className="flex flex-wrap items-center gap-4.5 border-t border-divider px-5.5 py-3.25">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-medium text-ink">{t("How often")}</span>
          <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("Daily is safer if you add many entries.")}</span>
        </span>
        <BoardSegment
          value={settings.every}
          label={t("How often")}
          disabled={!settings.auto || busy !== null || readOnly}
          onChange={(every) => void save({ every })}
          className="self-center"
          options={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4.5 border-t border-divider px-5.5 py-3.25">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body font-medium text-ink">{t("Keep")}</span>
          <span className="text-[12.5px] leading-[1.45] text-ink-muted">{t("Older backups are removed at the next backup.")}</span>
        </span>
        <select aria-label={t("Keep")} value={settings.keep} disabled={busy !== null || readOnly} onChange={(event) => void save({ keep: Number(event.target.value) })} className={cn(SELECT, "w-42.5")}>
          {[3, 5, 10].map((keep) => (
            <option key={keep} value={keep}>
              {t("Last {count} backups", { count: formatCount(keep, fmt) })}
            </option>
          ))}
        </select>
      </div>
      <div className="border-t border-divider px-5.5 pt-3 pb-1.5 text-[12px] font-semibold tracking-[0.04em] text-ink-muted uppercase">{backups.length > SHOWN && !all ? t("Last {count} backups", { count: formatCount(SHOWN, fmt) }) : t("Your backups")}</div>
      {backups.length === 0 && <p className="border-t border-divider px-5.5 py-3.5 text-small text-ink-muted">{t(settings.auto ? "No backup yet. The first one is made tonight at 2:00." : "No backup yet.")}</p>}
      {shown.map((row, index) => (
        <div key={row.id} className="flex items-center gap-3.5 border-t border-divider px-5.5 py-2.5">
          <span className="flex size-8.5 shrink-0 items-center justify-center rounded-[10px] bg-surface-sunken text-ink-soft">
            <Database className="size-4" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="flex flex-wrap items-center gap-2 text-body font-medium text-ink">
              {day(row)}
              {index === 0 && <span className="inline-flex h-5 items-center rounded-full bg-income-soft px-2 text-[11px] font-semibold text-income">{t("Latest")}</span>}
            </span>
            <span className="text-[12.5px] text-ink-muted">{t("at {time} · {size} · {kind}", { time: time(row), size: fileSizeText(row.size, fmt), kind: t(KIND[row.kind]) })}</span>
          </span>
          <Button variant="secondary" size="sm" className="h-8.5 px-3.5 text-small" disabled={busy !== null || readOnly} onClick={() => setAsked(row)}>
            {t("Restore")}
          </Button>
        </div>
      ))}
      {backups.length > SHOWN && (
        <div className="border-t border-divider px-5.5 py-2.5">
          <button type="button" onClick={() => setAll(!all)} className="text-small font-semibold text-emerald hover:underline">
            {all ? t("Show fewer") : t("Show all {count}", { count: formatCount(backups.length, fmt) })}
          </button>
        </div>
      )}
      <div className="h-1.5" />

      <PopupDialog
        open={asked !== null}
        onClose={() => setAsked(null)}
        busy={busy === "restore"}
        width={460}
        plain
        title={
          <span className="flex flex-col gap-3">
            <span className="flex size-11.5 items-center justify-center rounded-[14px] bg-warning-soft text-warning">
              <TriangleAlert className="size-5.5" aria-hidden="true" />
            </span>
            {asked ? t("Restore the backup from {date}?", { date: day(asked) }) : ""}
          </span>
        }
        titleClassName="text-[18px] font-semibold"
        sub={asked ? t("Your money records go back to how they were at {time} that day. Anything you added after that is replaced. We back up your records as they are now first, so you can undo.", { time: time(asked) }) : ""}
        footer={
          <>
            <Button variant="secondary" size="sm" className="h-9.5 text-[13.5px]" disabled={busy === "restore"} onClick={() => setAsked(null)}>
              {t("Cancel")}
            </Button>
            <Button size="sm" className="h-9.5 text-[13.5px]" disabled={busy === "restore"} onClick={() => asked && void restore(asked.id, false, day(asked))}>
              {t(busy === "restore" ? "Restoring…" : "Restore")}
            </Button>
          </>
        }
      />
    </section>
  );
}
