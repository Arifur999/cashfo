"use client";

import { ChevronUp } from "lucide-react";
import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { Drawer } from "@/components/modules/Customer/Books/shared/Drawer";
import Loader from "@/components/shared/Loader";
import Button from "@/components/smartly/Button";
import Chip from "@/components/smartly/Chip";
import ErrorState from "@/components/smartly/ErrorState";
import Field from "@/components/smartly/form/Field";
import Input from "@/components/smartly/form/Input";
import Textarea from "@/components/smartly/form/Textarea";
import type { FeatureIdea } from "@/lib/customer/api";
import { IDEA_STATUS } from "@/lib/customer/supportDisplay";
import { createIdeaAction, getIdeasAction, voteIdeaAction } from "@/lib/customer/supportActions";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface IdeasDrawerProps {
  open: boolean;
  onClose: () => void;
}

const byVotes = (a: FeatureIdea, b: FeatureIdea) => b.voteCount - a.voteCount || b.createdAt.localeCompare(a.createdAt);

// Settings > Help > Have an idea?: suggest a feature, and vote for what
// others asked for. Read each time it opens; a list from before stays on
// show while it is read again.
export function IdeasDrawer({ open, onClose }: IdeasDrawerProps) {
  const { t, fmt } = useLocale();
  const [ideas, setIdeas] = useState<FeatureIdea[] | null>(null);
  // The last read failed: with no list to show, the drawer says so.
  const [failed, setFailed] = useState(false);
  // Each opening, and each Try again, reads afresh.
  const [attempt, setAttempt] = useState(0);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setFailed(false);
  }

  const loaded = useEffectEvent((result: Awaited<ReturnType<typeof getIdeasAction>> | null) => {
    if (result?.success) {
      setIdeas(result.data ?? []);
      setFailed(false);
      return;
    }
    setFailed(true);
    // A list already on show stays; the toast says it may be out of date.
    if (ideas) toast.error(result?.message ?? t("Failed to load ideas"));
  });

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getIdeasAction().then(
      (result) => {
        if (!cancelled) loaded(result);
      },
      () => {
        if (!cancelled) loaded(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, attempt]);

  function retry() {
    setFailed(false);
    setAttempt((count) => count + 1);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error(t("Say what you'd like the app to do."));
      return;
    }
    startTransition(async () => {
      const result = await createIdeaAction({ title: title.trim(), ...(description.trim() && { description: description.trim() }) });
      if (!result.success || !result.data) {
        toast.error(result.message ?? t("Failed to add your idea"));
        return;
      }
      const added = result.data;
      toast.success(t("Thanks! Your idea is on the list."));
      setTitle("");
      setDescription("");
      setIdeas((current) => [...(current ?? []), added].sort(byVotes));
    });
  }

  // Counted at once, put back if the vote isn't saved.
  function vote(idea: FeatureIdea) {
    const on = !idea.voted;
    const swap = (next: FeatureIdea) => setIdeas((current) => current?.map((row) => (row.id === next.id ? next : row)) ?? null);
    swap({ ...idea, voted: on, voteCount: idea.voteCount + (on ? 1 : -1) });
    voteIdeaAction(idea.id, on).then((result) => {
      if (result.success && result.data) swap(result.data);
      else {
        swap(idea);
        toast.error(result.message ?? t("Failed to save your vote"));
      }
    });
  }

  return (
    <Drawer
      open={open}
      title={t("Ideas for Smartly")}
      busy={isPending}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending} className="pointer-coarse:h-11">
            {t("Close")}
          </Button>
          <Button type="submit" variant="action" disabled={isPending} className="px-5 pointer-coarse:h-11">
            {isPending && <Loader />}
            {t("Add idea")}
          </Button>
        </>
      }
    >
      <Field htmlFor="idea-title" label={t("Your idea")}>
        <Input id="idea-title" size="md" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder={t("For example: a reminder before a bill is due")} />
      </Field>
      <Field htmlFor="idea-more" label={t("Tell us more (optional)")}>
        <Textarea id="idea-more" rows={3} value={description} maxLength={2000} onChange={(event) => setDescription(event.target.value)} className="resize-none" />
      </Field>

      <h3 className="mt-2 text-body font-semibold text-ink">{t("What others asked for")}</h3>
      {ideas === null &&
        (failed ? (
          <ErrorState bordered={false} title={t("Couldn't load ideas")} onRetry={retry} />
        ) : (
          <div className="flex justify-center py-8">
            <Loader size={20} label="Loading..." />
          </div>
        ))}
      {ideas?.length === 0 && <p className="text-small text-ink-muted">{t("No ideas yet. Yours can be the first.")}</p>}
      {ideas && ideas.length > 0 && (
        <ul className="flex flex-col gap-2">
          {ideas.map((idea) => {
            const status = IDEA_STATUS[idea.status];
            return (
              <li key={idea.id} className="flex gap-3 rounded-md border border-line p-3">
                <button
                  type="button"
                  aria-pressed={idea.voted}
                  aria-label={t(idea.voted ? "Take back your vote for {title}" : "Vote for {title}", { title: idea.title })}
                  onClick={() => vote(idea)}
                  className={cn(
                    "flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-md border text-small font-bold tabular-nums",
                    idea.voted ? "border-emerald bg-mint-50 text-emerald" : "border-line bg-surface text-ink-2 hover:bg-surface-sunken",
                  )}
                >
                  <ChevronUp className="size-4" aria-hidden="true" />
                  {formatCount(idea.voteCount, fmt)}
                </button>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-body font-semibold wrap-break-word text-ink">{idea.title}</span>
                  {idea.description && <span className="line-clamp-2 text-small text-ink-2">{idea.description}</span>}
                  <span className="flex flex-wrap gap-1.5">
                    <Chip tone={status.tone} size="sm">
                      {t(status.label)}
                    </Chip>
                    {idea.mine && (
                      <Chip tone="neutral" size="sm">
                        {t("Yours")}
                      </Chip>
                    )}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}
