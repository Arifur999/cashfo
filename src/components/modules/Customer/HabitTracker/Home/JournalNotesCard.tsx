"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import Card from "@/components/smartly/Card";
import type { JournalSummary } from "@/lib/customer/api";
import { MOODS } from "@/lib/customer/writingDisplay";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface JournalNotesCardProps {
  // Null when it couldn't be read.
  summary: JournalSummary | null;
}

// Journal & notes on the dashboard (the HabitDashboard board's fifth card):
// whether today is written and the writing streak, the newest note, and a
// way to jot one down.
export function JournalNotesCard({ summary }: JournalNotesCardProps) {
  const { t, fmt } = useLocale();
  const written = !!summary?.today.written;
  const mood = summary?.today.mood ?? null;
  const streak = summary?.streak ?? 0;
  const note = summary?.latestNote ?? null;

  return (
    <Card padding="none" className="flex flex-col gap-2.5 rounded-md px-4.5 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] leading-[normal] font-semibold text-ink">{t("Journal & notes")}</h2>
        <Link href="/habit-tracker/notes" className="text-small font-semibold text-emerald hover:underline">
          {t("Notes")}
        </Link>
      </div>
      <Link
        href="/habit-tracker/journal"
        className={cn("flex items-center gap-2.5 rounded-field border px-3 py-2.5 text-ink transition-colors", written ? "border-income/30 bg-income-soft hover:border-income/50" : "border-line bg-strip hover:border-line-strong")}
      >
        <span aria-hidden="true" className="text-[22px]">
          {written ? (mood === null ? "🔒" : MOODS[mood]?.emoji) : "✍️"}
        </span>
        <span className="flex min-w-0 flex-col">
          <b className="text-small">{t(written ? "Today's journal is written" : "Write today's journal")}</b>
          <span className="text-caption text-ink-soft">{streak > 0 ? `🔥 ${t("{count}-day writing streak", { count: formatCount(streak, fmt) })}` : t("A few lines and a mood")}</span>
        </span>
      </Link>
      <div className="flex flex-col gap-1">
        <span className="text-caption font-semibold text-ink-muted">{t("Latest note")}</span>
        <span className="line-clamp-2 text-small leading-[1.45] text-ink-2">{note ? `${note.kind === "IDEA" ? "💡 " : ""}${note.title || note.body}` : t("No notes yet.")}</span>
      </div>
      <Link href="/habit-tracker/notes?new=1" className="mt-auto flex items-center gap-1.5 border-t border-divider pt-2.5 text-[12.5px] font-semibold text-emerald hover:underline">
        <Plus className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
        {t("Quick note")}
      </Link>
    </Card>
  );
}
