"use client";

import { ArrowRight, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import Loader from "@/components/shared/Loader";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import type { Book, ReadingDayRange } from "@/lib/customer/api";
import { logReadingAction } from "@/lib/customer/bookActions";
import { actionError } from "@/lib/customer/habitDisplay";
import { longDay, quickAdds, readingLogPlan, readingToProblem } from "@/lib/customer/libraryBoard";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "./BookNoteDialog";
import { coverColors, DayField, LB_ERROR, LB_LABEL, LB_OUTLINE, LB_PRIMARY } from "./LibraryBits";

interface ReadingLogDialogProps {
  open: boolean;
  onClose: () => void;
  book: Book | null;
  last: { latest: ReadingDayRange; before: string | null } | undefined;
  today: string;
  // Books finished this year before this one, for "Book 8 this year!".
  finishedThisYear: number;
}

// ReadingLog: the page the reader stopped at today (or on an earlier day
// after the last one logged); the page they began on is filled in.
export function ReadingLogDialog({ open, onClose, book, last, today, finishedThisYear }: ReadingLogDialogProps) {
  const { t, fmt } = useLocale();
  const router = useRouter();
  const [day, setDay] = useState(today);
  const [to, setTo] = useState("");
  const [finish, setFinish] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const toRef = useRef<HTMLInputElement>(null);
  const count = (n: number) => formatCount(n, fmt);

  const [prevKey, setPrevKey] = useState("closed");
  const key = open && book ? book.id : "closed";
  if (key !== prevKey) {
    setPrevKey(key);
    if (open && book) {
      const plan = readingLogPlan(book, last, today);
      setDay(today);
      setTo(plan.loggedTo !== null ? String(plan.loggedTo) : "");
      setFinish(true);
      setError("");
    }
  }

  if (!book) return null;
  const plan = readingLogPlan(book, last, day, last?.before ? [last.before] : []);
  const { color, dark } = coverColors(book.color);
  const soft = `color-mix(in srgb, ${color} 8%, var(--surface))`;
  const dayError = plan.dayProblem
    ? plan.dayProblem.kind === "closed"
      ? t("Reading after this date is already logged. Pick {date} or later.", { date: longDay(plan.dayProblem.after, fmt) })
      : t("Only the latest day can be changed here.")
    : "";
  const parsed = readingToProblem(to, plan.from, book.totalPages);
  const valid = !dayError && "to" in parsed;
  const read = valid ? parsed.to - plan.from : 0;
  const pct = (n: number) => Math.round((n / book.totalPages) * 100);
  const left = valid ? book.totalPages - parsed.to : 0;
  const atEnd = valid && parsed.to === book.totalPages;

  function save() {
    if (isPending || !book) return;
    if (dayError) return setError(dayError);
    if ("problem" in parsed) {
      const problem = parsed.problem;
      return setError(
        problem === "empty"
          ? t("Write the page you stopped at.")
          : problem === "whole"
            ? t("Use a whole number, like {page}.", { page: count(plan.from + 10) })
            : problem === "notAfter"
              ? t("Write a page after {page}.", { page: count(plan.from) })
              : t("This book has {count} pages.", { count: count(book.totalPages) }),
      );
    }
    const target = book;
    const page = parsed.to;
    const willFinish = page === target.totalPages && finish;
    startTransition(async () => {
      const result = await logReadingAction(target.id, { date: day, toPage: page, finish: willFinish });
      if (!result.success) {
        setError(actionError(result.message, "Failed to save the reading", t, fmt));
        return;
      }
      toast.success(
        willFinish
          ? t("Finished {title}! Book {count} this year.", { title: target.title, count: count(finishedThisYear + 1) })
          : day === today
            ? t("Saved: {count} pages today. Well done!", { count: count(page - plan.from) })
            : t("Saved: {count} pages on {date}. Well done!", { count: count(page - plan.from), date: longDay(day, fmt) }),
      );
      onClose();
      router.refresh();
    });
  }

  return (
    <PopupDialog
      open={open}
      onClose={onClose}
      busy={isPending}
      width={540}
      className="rounded-[18px] leading-[normal]" subClassName="leading-[normal]"
      headClassName="items-center gap-3.5 px-5.5 py-4.5"
      headStyle={{ background: `linear-gradient(180deg, ${soft} 0%, var(--surface) 100%)` }}
      titleClassName="text-[19px] font-bold"
      lead={<span aria-hidden="true" className="h-13.5 w-9.5 shrink-0 rounded-[3px_7px_7px_3px] shadow-[inset_4px_0_0_rgba(0,0,0,0.2)]" style={{ background: `linear-gradient(155deg, ${color} 0%, ${dark} 100%)` }} />}
      title={t(plan.correcting ? "Edit reading" : "Log today’s reading")}
      sub={<span className="block truncate text-[13px]">{book.title}</span>}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        toRef.current?.focus();
        toRef.current?.select();
      }}
      bodyClassName="gap-4 px-5.5 py-4.5"
      footerClassName="px-5.5"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isPending} className={cn(LB_OUTLINE, "mr-auto")}>
            {t("Cancel")}
          </button>
          <button type="button" onClick={save} disabled={isPending} className={cn(LB_PRIMARY, "min-w-35")}>
            {isPending && <Loader />}
            {valid ? t("Save {count} pages", { count: count(read) }) : t("Save")}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="rl-date" className={LB_LABEL}>
          {t("Date")}
        </label>
        <DayField
          id="rl-date"
          value={day}
          min={plan.minDay}
          max={today}
          invalid={!!dayError}
          label={longDay(day, fmt)}
          className="font-semibold"
          before={
            <>
              <CalendarIcon className="text-emerald" />
              {day === today && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[12px] font-bold text-tint-green-ink">{t("Today")}</span>}
            </>
          }
          after={<span className="text-[12px] font-normal text-ink-muted">{t("Change")}</span>}
          onChange={(value) => {
            const next = readingLogPlan(book, last, value);
            setDay(value);
            setTo(next.loggedTo !== null ? String(next.loggedTo) : "");
            setError("");
          }}
        />
        {dayError && <span className={LB_ERROR}>{dayError}</span>}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] items-stretch gap-2.5 leading-[normal]">
        <div className="flex flex-col gap-1 rounded-[12px] border border-line bg-page p-3.5">
          <span className="flex items-center gap-1.5 text-[12.5px] text-ink-muted">
            <Lock className="size-3" strokeWidth={2.25} aria-hidden="true" />
            {t("Read before, up to page")}
          </span>
          <span className="text-[26px] font-bold text-ink-2 tabular-nums">{count(plan.from)}</span>
          <span className="text-[11.5px] text-ink-faint">{t("Filled in for you")}</span>
        </div>
        <span aria-hidden="true" className="flex items-center justify-center text-ink-faint">
          <ArrowRight className="size-5" strokeWidth={2.25} />
        </span>
        <label className={cn("flex cursor-text flex-col gap-1 rounded-[12px] border-[1.5px] p-3.5", error && "border-expense")} style={{ background: soft, ...(error ? {} : { borderColor: color }) }}>
          <span className="text-[12.5px] font-semibold" style={{ color }}>
            {t("Read up to page")}
          </span>
          <span className="flex items-baseline gap-1.5">
            <input
              ref={toRef}
              inputMode="numeric"
              value={to}
              onChange={(event) => {
                setTo(event.target.value.slice(0, 6));
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  save();
                }
              }}
              placeholder={count(Math.min(book.totalPages, plan.from + 20))}
              aria-label={t("Read up to page")}
              className="w-full min-w-0 border-0 bg-transparent text-[26px] font-bold text-ink tabular-nums outline-none placeholder:text-ink-faint"
            />
            <span className="shrink-0 text-[13px] text-ink-muted">/ {count(book.totalPages)}</span>
          </span>
          <span className="text-[11.5px] text-ink-muted">{t("Write the page you stopped at")}</span>
        </label>
      </div>

      {quickAdds(plan.from, book.totalPages).length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12.5px] text-ink-muted">{t("Quick add:")}</span>
          {quickAdds(plan.from, book.totalPages).map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => {
                setTo(String(plan.from + step));
                setError("");
              }}
              className="h-8 rounded-full border border-emerald-line bg-emerald-soft px-3 text-[13px] font-bold text-emerald tabular-nums hover:border-emerald"
            >
              +{count(step)}
            </button>
          ))}
        </div>
      )}

      {error && error !== dayError && (
        <div role="alert" className="rounded-[10px] bg-expense-soft px-3 py-2.5 text-[13px] font-semibold text-expense">
          {error}
        </div>
      )}

      {valid && (
        <div className="flex flex-col gap-2.5 rounded-[12px] border border-success-line/60 bg-note-green px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="text-[15px] font-bold text-success-ink">{day === today ? t("Today you read {count} pages", { count: count(read) }) : t("You read {count} pages", { count: count(read) })}</span>
            <span className="text-[13px] font-semibold text-tint-green-ink tabular-nums">
              {count(parsed.to)} / {count(book.totalPages)} · {count(pct(parsed.to))}%
            </span>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-success-soft">
            <span className="absolute inset-y-0 left-0 opacity-55" style={{ width: `${(plan.from / book.totalPages) * 100}%`, background: color }} />
            <span className="absolute inset-y-0 bg-success" style={{ left: `${(plan.from / book.totalPages) * 100}%`, width: `${(read / book.totalPages) * 100}%` }} />
          </div>
          <span className="text-[12.5px] text-success-ink">
            {left > 0 ? t("{count} pages left · about {days} more days at this pace", { count: count(left), days: count(Math.max(1, Math.ceil(left / Math.max(read, 1)))) }) : t("That is the last page!")}
          </span>
          {atEnd && (
            <label className="flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold text-success-ink">
              <input type="checkbox" checked={finish} onChange={(event) => setFinish(event.target.checked)} className="size-4 accent-success" />
              {t("Mark this book as finished")}
            </label>
          )}
        </div>
      )}
    </PopupDialog>
  );
}
