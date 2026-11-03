"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import Button from "@/components/smartly/Button";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import Textarea from "@/components/smartly/form/Textarea";
import type { JournalEntry, JournalKind, NoteCategory } from "@/lib/customer/api";
import { saveJournalEntryAction } from "@/lib/customer/writingActions";
import { categoryDotClass, JOURNAL_BODY_MAX, JOURNAL_PROMPT_MAX, MOODS, tagsInText } from "@/lib/customer/writingDisplay";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface JournalEditorProps {
  date: string;
  // "Today, Friday 2 October".
  title: string;
  // The day's entry, or null when nothing is written yet.
  entry: JournalEntry | null;
  categories: NoteCategory[];
  pinSet: boolean;
  onSaved: (entry: JournalEntry) => void;
  // The entry turned out private and locked (another tab locked the diary).
  onLocked: () => void;
  // A private entry needs a PIN first: set one, then run `then`.
  onNeedPin: (then: () => void) => void;
  onChangePin?: () => void;
}

const PROMPTS = [
  { key: "wentWell", label: "✨ What went well", placeholder: "One good thing…", tone: "text-income" },
  { key: "gratefulFor", label: "🤲 Grateful for", placeholder: "Someone or something…", tone: "text-warning-ink" },
  { key: "tomorrow", label: "🎯 Tomorrow I will", placeholder: "One small step…", tone: "text-info" },
] as const;

type PromptKey = (typeof PROMPTS)[number]["key"];

// One day's entry (the board's right panel): Daily or Diary, private or
// not, the mood, the three prompts of a daily journal, the free text, a
// category, and the #tags found in it.
export function JournalEditor({ date, title, entry, categories, pinSet, onSaved, onLocked, onNeedPin, onChangePin }: JournalEditorProps) {
  const { t } = useLocale();
  const [kind, setKind] = useState<JournalKind>(entry?.kind ?? "DAILY");
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [prompts, setPrompts] = useState<Record<PromptKey, string>>({ wentWell: entry?.wentWell ?? "", gratefulFor: entry?.gratefulFor ?? "", tomorrow: entry?.tomorrow ?? "" });
  const [body, setBody] = useState(entry?.body ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(entry && categories.some((category) => category.id === entry.categoryId) ? entry.categoryId : null);
  const [isPrivate, setIsPrivate] = useState(entry?.isPrivate ?? false);
  const [dirty, setDirty] = useState(false);
  const [moodError, setMoodError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const change = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setDirty(true);
  };

  const daily = kind === "DAILY";
  const tags = tagsInText(body, ...(daily ? Object.values(prompts) : []));
  const status = entry ? (dirty ? t("Unsaved changes") : t(entry.kind === "DIARY" ? "Saved · Diary" : "Saved · Daily journal")) : dirty ? t("Unsaved changes") : t("Nothing written yet. Start with your mood.");

  const togglePrivate = () => {
    if (!isPrivate && !pinSet) {
      onNeedPin(() => {
        setIsPrivate(true);
        setDirty(true);
      });
      return;
    }
    change(setIsPrivate)(!isPrivate);
  };

  const save = () => {
    if (mood === null) {
      setMoodError(true);
      toast.error(t("Pick a mood first"));
      return;
    }
    startTransition(async () => {
      const result = await saveJournalEntryAction(date, { kind, mood, wentWell: daily ? prompts.wentWell : "", gratefulFor: daily ? prompts.gratefulFor : "", tomorrow: daily ? prompts.tomorrow : "", body, categoryId, isPrivate });
      if (!result.success || !result.data) {
        if (result.reason === "PIN_REQUIRED") onNeedPin(() => setIsPrivate(true));
        else if (result.reason === "JOURNAL_LOCKED") onLocked();
        toast.error(t(result.message ?? "Failed to save the entry"));
        return;
      }
      setDirty(false);
      toast.success(`${t("Entry saved")} ${MOODS[mood].emoji}${result.data.isPrivate ? ` · ${t("private")}` : ""}`);
      onSaved(result.data);
    });
  };

  return (
    <form
      className="flex flex-1 flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
          <span className="text-[12.5px] text-ink-muted" aria-live="polite">
            {status}
          </span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label={t("Kind")}
            variant="pill"
            value={kind}
            onChange={change(setKind)}
            options={[
              { value: "DAILY", label: `📝 ${t("Daily")}` },
              { value: "DIARY", label: `📔 ${t("Diary")}` },
            ]}
          />
          <button
            type="button"
            role="switch"
            aria-checked={isPrivate}
            onClick={togglePrivate}
            className={cn("h-8.5 rounded-sm border px-3 text-small font-semibold transition-colors", isPrivate ? "border-warning-line bg-warning-soft text-warning-ink" : "border-line bg-surface text-ink-soft hover:bg-surface-sunken")}
          >
            {isPrivate ? `🔒 ${t("Private")}` : `🔓 ${t("Not private")}`}
          </button>
          {onChangePin && (
            <button type="button" onClick={onChangePin} className="rounded-sm text-caption font-semibold text-emerald hover:underline">
              {t("Change PIN")}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t("How was today?")}>
        <span className="mr-1.5 text-small font-semibold text-ink-2">{t("How was today?")}</span>
        {MOODS.map((option, index) => (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={mood === index}
            aria-label={t(option.label)}
            title={t(option.label)}
            onClick={() => {
              change(setMood)(index);
              setMoodError(false);
            }}
            className={cn("h-10 w-11 rounded-field border-[1.5px] text-[22px] leading-none transition-colors", mood === index ? cn("bg-surface", option.ringClass) : moodError ? "border-expense bg-strip" : "border-line bg-strip hover:border-line-strong")}
          >
            <span aria-hidden="true">{option.emoji}</span>
          </button>
        ))}
        <span className="ml-1.5 text-[12.5px] text-ink-muted">{mood === null ? t("Pick one") : t(MOODS[mood].label)}</span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5">
        {daily && (
          <div className="grid gap-2.5 md:grid-cols-3">
            {PROMPTS.map((prompt) => (
              <label key={prompt.key} className="flex flex-col gap-1.25">
                <span className={cn("text-[12.5px] font-semibold", prompt.tone)}>{t(prompt.label)}</span>
                <Textarea
                  rows={3}
                  value={prompts[prompt.key]}
                  maxLength={JOURNAL_PROMPT_MAX}
                  placeholder={t(prompt.placeholder)}
                  onChange={(event) => change(setPrompts)({ ...prompts, [prompt.key]: event.target.value })}
                  className="resize-none text-[13.5px] leading-normal"
                />
              </label>
            ))}
          </div>
        )}
        <label className="flex flex-1 flex-col gap-1.25">
          <span className="text-[12.5px] font-semibold text-ink-2">{t(daily ? "💭 Anything else" : "📔 Dear diary…")}</span>
          <Textarea
            value={body}
            maxLength={JOURNAL_BODY_MAX}
            placeholder={t("Write anything… use #tags to find it later")}
            onChange={(event) => change(setBody)(event.target.value)}
            className="min-h-30 flex-1 resize-none text-body leading-[1.6]"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px] font-semibold text-ink-2">{t("Category")}</span>
        {categories.map((category) => {
          const on = categoryId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={on}
              onClick={() => change(setCategoryId)(on ? null : category.id)}
              className={cn("inline-flex h-7 items-center gap-1.25 rounded-full border-[1.5px] bg-surface px-2.5 text-caption font-semibold text-ink transition-colors", on ? "border-ink-soft" : "border-line hover:border-line-strong")}
            >
              <span aria-hidden="true" className={cn("size-2 rounded-[2px]", categoryDotClass(category.color))} />
              {category.name}
            </button>
          );
        })}
        <span className="flex-1" />
        {tags.map((tag) => (
          <span key={tag} className="text-caption font-semibold text-emerald">
            #{tag}
          </span>
        ))}
        <Button type="submit" className="h-9.5 rounded-sm px-5" disabled={isPending}>
          {t("Save entry")}
        </Button>
      </div>
    </form>
  );
}
