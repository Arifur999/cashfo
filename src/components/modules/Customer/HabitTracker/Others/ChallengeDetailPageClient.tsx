"use client";

import { Check, ChevronLeft, Flame, MoreVertical, Plus, Target, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import IconTile from "@/components/smartly/IconTile";
import PageFrame from "@/components/smartly/PageFrame";
import PageHeader from "@/components/smartly/PageHeader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { HabitMonthTracker } from "@/lib/customer/api";
import { challengeMark, challengeSummary, challengeWindow, dayDone } from "@/lib/customer/challengeDisplay";
import { formatDate } from "@/lib/customer/date";
import { deleteHabitTrackerAction, removeTrackerItemAction, setHabitTrackerCheckAction } from "@/lib/customer/habitsActions";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { AddRowDialog } from "../Tracker/AddRowDialog";
import { withCheck } from "../trackerChecks";

interface ChallengeDetailPageClientProps {
  tracker: HabitMonthTracker;
  today: string;
}

// One challenge: where it stands, every day as a box (tap a past day to
// fix it), and today's items to tick.
export function ChallengeDetailPageClient({ tracker, today }: ChallengeDetailPageClientProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isPending, startSlow] = useTransition();
  const [sheet, applyCheck] = useOptimistic(tracker, (current, update: { day: number; item: string; checked: boolean }) => withCheck(current, update.day, update.item, update.checked));
  const [addOpen, setAddOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "remove-row"; item: string } | { kind: "delete" } | null>(null);

  const window = challengeWindow(sheet, today);
  const summary = challengeSummary(sheet, window);
  const items = sheet.items.length > 0 ? sheet.items : ["done"];
  const name = sheet.name ?? t("Challenge");
  const todayDone = window.status === "going" && dayDone(sheet, window.today);

  function set(day: number, item: string, checked: boolean) {
    startTransition(async () => {
      applyCheck({ day, item, checked });
      const result = await setHabitTrackerCheckAction(sheet.id, { day, item, checked });
      if (result.success) router.refresh();
      else toast.error(result.message ?? t("Failed to update"));
    });
  }

  // A past day is fixed as a whole: every item on, or every item off.
  function toggleDay(day: number) {
    const done = dayDone(sheet, day);
    startTransition(async () => {
      for (const item of items) {
        applyCheck({ day, item, checked: !done });
        await setHabitTrackerCheckAction(sheet.id, { day, item, checked: !done });
      }
      router.refresh();
    });
  }

  function runConfirm() {
    if (!confirm) return;
    const action = confirm;
    startSlow(async () => {
      const result = action.kind === "delete" ? await deleteHabitTrackerAction(sheet.id) : await removeTrackerItemAction(sheet.id, action.item);
      if (result.success) {
        toast.success(action.kind === "delete" ? t("Challenge removed") : t("Row removed"));
        setConfirm(null);
        if (action.kind === "delete") router.push("/habit-tracker/habits?category=Others");
        router.refresh();
      } else {
        toast.error(result.message ?? t("Failed to update"));
      }
    });
  }

  return (
    <PageFrame className="gap-6">
      <PageHeader
        eyebrow={
          <span className="flex flex-col gap-1">
            <Link href="/habit-tracker/habits?category=Others" className="flex items-center gap-1 text-small font-semibold text-emerald normal-case tracking-normal hover:text-emerald-hover">
              <ChevronLeft className="size-4" aria-hidden="true" />
              {t("All challenges")}
            </Link>
            <span>
              {t("Habits")} › {t("Challenges")}
            </span>
          </span>
        }
        tone="habits"
        title={name}
        actions={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(true)}>
              <Plus />
              {t("Add a row")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger aria-label={t("More")} className="flex size-10 items-center justify-center rounded-md border border-line-strong bg-surface text-ink hover:bg-cream data-open:bg-cream">
                <MoreVertical className="size-4.5" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay ring-0">
                {sheet.items.map((item) => (
                  <DropdownMenuItem key={item} onSelect={() => setConfirm({ kind: "remove-row", item })} className="rounded-md px-3 py-2 text-body text-ink focus:bg-cream">
                    <Trash2 className="size-4" aria-hidden="true" />
                    {t("Remove")} {item}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onSelect={() => setConfirm({ kind: "delete" })} className="rounded-md px-3 py-2 text-body text-expense focus:bg-expense-soft focus:text-expense">
                  <Trash2 className="size-4" aria-hidden="true" />
                  {t("Delete challenge")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <Card padding="none" className="flex flex-col gap-5 rounded-xl p-6 md:flex-row md:items-center">
        <IconTile tone="habits" size={72} className="rounded-lg [&_svg]:size-7">
          <Target />
        </IconTile>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-small text-ink-muted">
            {t("Started")} {formatDate(window.start, "EEE, d MMM")} · {t("ends")} {formatDate(window.end, "EEE, d MMM")}
          </span>
          <span className="text-h1 text-ink">{name}</span>
          <span className="text-body text-ink-2">
            {window.status === "finished" ? `${t("Finished")} · ${summary.done} ${t("of")} ${sheet.totalDays} ${t("days done")}` : `${t("Day")} ${window.today} ${t("of")} ${sheet.totalDays} · ${summary.missed === 0 ? t("every day done so far") : `${summary.missed} ${t(summary.missed === 1 ? "day missed" : "days missed")}`}`}
          </span>
        </div>
        <div className="flex gap-6 text-center">
          <span className="flex flex-col gap-1">
            <span className="text-small text-ink-muted">{t("Streak")}</span>
            <span className="flex items-center justify-center gap-1 text-[22px] leading-tight font-bold whitespace-nowrap text-pillar-habits tabular-nums">
              <Flame className="size-4.5" aria-hidden="true" />
              {summary.streak} {t(summary.streak === 1 ? "day" : "days")}
            </span>
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-small text-ink-muted">{t("Done")}</span>
            <span className="text-[22px] leading-tight font-bold text-ink tabular-nums">{summary.pct}%</span>
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-small text-ink-muted">{t("Days left")}</span>
            <span className="text-[22px] leading-tight font-bold text-ink tabular-nums">{window.daysLeft}</span>
          </span>
        </div>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card padding="none" className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-h3 text-ink">
              {sheet.totalDays} {t("days")}
            </h3>
            <span className="text-small text-ink-muted">{t("Tap a past day to fix it")}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,44px)] gap-3">
            {Array.from({ length: sheet.totalDays }, (_, i) => i + 1).map((day) => {
              const mark = challengeMark(sheet, window, day);
              const past = day <= window.today && day <= sheet.totalDays;
              return (
                <button key={day} type="button" disabled={!past} onClick={() => toggleDay(day)} title={`${t("Day")} ${day}: ${t(mark === "done" ? "done" : mark === "missed" ? "missed" : mark === "today" ? "today" : "later")}`} className={cn("flex size-11 items-center justify-center rounded-md text-body font-bold transition-colors", mark === "done" && "bg-emerald text-white", mark === "missed" && "bg-expense-soft text-expense", mark === "today" && "border-[3px] border-pillar-habits bg-surface text-ink", mark === "later" && "cursor-not-allowed bg-cream text-ink-muted", day === window.today && mark === "done" && "ring-[3px] ring-pillar-habits ring-inset")}>
                  {mark === "done" ? <Check className="size-4.5" strokeWidth={3} aria-hidden="true" /> : day}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 text-caption font-normal text-ink-muted">
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-[4px] bg-emerald" /> {t("Done")}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-[4px] bg-expense-soft" /> {t("Missed")}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-[4px] border-2 border-pillar-habits bg-surface" /> {t("Today")}
            </span>
            <span className="flex items-center gap-2">
              <span className="size-3 rounded-[4px] border border-line bg-cream" /> {t("Still to come")}
            </span>
          </div>
        </Card>

        <Card padding="none" className="flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-h3 text-ink">
              {window.status === "finished" ? t("Finished") : `${t("Today")} · ${t("day")} ${window.today}`}
            </h3>
            <span className="text-small text-ink-muted">{formatDate(today, "EEE, d MMM")}</span>
          </div>
          {window.status === "going" &&
            items.map((item) => {
              const checked = sheet.checks.some((c) => c.day === window.today && c.item === item);
              return (
                <label key={item} className={cn("flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-body transition-colors", checked ? "border-mint-200 bg-mint-50" : "border-line hover:border-line-strong")}>
                  <input type="checkbox" checked={checked} onChange={() => set(window.today, item, !checked)} className="sr-only" />
                  <span className={cn("flex size-5 items-center justify-center rounded-sm", checked ? "bg-emerald text-white" : "border-[1.5px] border-line-strong bg-surface")}>{checked && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}</span>
                  <span className="text-ink">{item === "done" && sheet.items.length === 0 ? t("Done for today") : item}</span>
                </label>
              );
            })}
          {window.status === "going" && todayDone && (
            <div className="flex items-start gap-3 rounded-md bg-mint-50 px-4 py-3 text-small leading-snug text-brand-ink">
              <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {t("Done for today.")} {summary.streak} {t(summary.streak === 1 ? "day in a row." : "days in a row.")}
              </span>
            </div>
          )}
          {window.status === "finished" && (
            <p className="text-small leading-relaxed text-ink-2">
              {summary.done} {t("of")} {sheet.totalDays} {t("days done")} · {summary.pct}%. {t("Start another from the challenges page.")}
            </p>
          )}
        </Card>
      </div>

      <AddRowDialog open={addOpen} onClose={() => setAddOpen(false)} trackerId={sheet.id} existing={sheet.items} suggestions={[]} description={t("A daily item of this challenge. A day counts as done when every item is ticked.")} />
      <ConfirmDialog
        open={confirm !== null}
        onClose={() => !isPending && setConfirm(null)}
        onConfirm={runConfirm}
        icon={<Trash2 />}
        title={confirm?.kind === "delete" ? `${t("Delete")} ${name}?` : `${t("Remove")} ${confirm?.kind === "remove-row" ? confirm.item : ""}?`}
        description={confirm?.kind === "delete" ? t("Its days and ticks go with it. This can't be undone.") : t("Its ticks on this sheet go with it.")}
        confirmLabel={confirm?.kind === "delete" ? t("Delete challenge") : t("Remove")}
        isPending={isPending}
      />
    </PageFrame>
  );
}
