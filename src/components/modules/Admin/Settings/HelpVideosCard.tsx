"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { addHelpVideoAction, deleteHelpVideoAction, orderHelpVideosAction, updateHelpVideoAction } from "@/app/(dashboardLayout)/admin/settings/_action";
import { SmallSwitch } from "@/components/modules/Customer/Settings/boardUi";
import { PopupDialog } from "@/components/modules/Customer/Shared/PopupDialog";
import AppField from "@/components/shared/form/AppField";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import ErrorState from "@/components/smartly/ErrorState";
import IconAction from "@/components/smartly/IconAction";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { CATEGORY_LABEL, VIDEO_CATEGORIES, youtubeIdOf, type VideoCategory } from "@/lib/customer/helpPage";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { adminHelpQuery } from "@/queries/help.queries";
import type { IHelpVideo, IHelpVideoPayload } from "@/types/help.types";
import { helpVideoFormZodSchema, type IHelpVideoFormValues } from "@/zod/help.validation";

// The board's columns: order, title, category, minutes, link, show, actions.
const COLUMNS = "grid grid-cols-[112px_minmax(0,1fr)_150px_80px_minmax(0,260px)_76px_84px] items-center gap-x-3.5";

// Each category's chip, as the board tints them.
const CATEGORY_CHIP: Record<VideoCategory, string> = {
  GETTING_STARTED: "bg-mint-50 text-brand-ink",
  INCOME_EXPENSE: "bg-info-soft text-info",
  SAVINGS: "bg-income-soft text-income",
  LOANS: "bg-orange-soft text-orange",
  GROUP_EXPENSE: "bg-pillar-habits-soft text-pillar-habits",
  SECURITY: "bg-surface-sunken text-ink-2",
  OTHER: "bg-surface-sunken text-ink-2",
};

// The board's red play-box mark (lucide has no brand icons).
const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-3.75 shrink-0 text-expense">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const watchLink = (id: string) => `https://www.youtube.com/watch?v=${id}`;
const payloadOf = (video: IHelpVideo): IHelpVideoPayload => ({ titleEn: video.titleEn, titleBn: video.titleBn ?? undefined, category: video.category, minutes: video.minutes, youtube: video.youtubeId, shown: video.shown });

// "Video guides" as the v16 board draws it: the YouTube videos users see on
// the Help page, in this order, with the Bangla title when the app is in
// Bangla; a hidden one stays here as a draft. Add, change, reorder (the
// arrows), show or hide, and delete -- each with a few seconds to undo. Only
// a super admin changes them, and every change is in the audit log.
const HelpVideosCard = ({ canManage }: { canManage: boolean }) => {
  const { translate, locale } = useLocale();
  const titleId = useId();
  const client = useQueryClient();
  const query = useQuery(adminHelpQuery());
  const videos = query.data?.data?.videos;
  const [editing, setEditing] = useState<IHelpVideo | "new" | null>(null);
  const [deleting, setDeleting] = useState<IHelpVideo | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.help.all });
  const shown = videos?.filter((video) => video.shown).length ?? 0;

  // Runs a change; on success says so with an Undo that runs `undo`.
  async function change(work: () => Promise<{ success: boolean; message?: string }>, failed: string, done: string, undo?: () => Promise<{ success: boolean; message?: string }>) {
    setBusy(true);
    const result = await work();
    setBusy(false);
    if (!result.success) return void toast.error(translate(result.message || failed));
    await refresh();
    toast.success(translate(done), undo && {
      action: {
        label: translate("Undo"),
        onClick: async () => {
          const back = await undo();
          if (!back.success) return void toast.error(translate(back.message || "Couldn't undo it"));
          await refresh();
        },
      },
    });
  }

  function move(index: number, step: -1 | 1) {
    if (!videos || busy) return;
    const before = videos.map((video) => video.id);
    const ids = [...before];
    [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
    void change(() => orderHelpVideosAction({ ids }), "Couldn't save the order", "Order saved", () => orderHelpVideosAction({ ids: before }));
  }

  function toggleShown(video: IHelpVideo) {
    void change(
      () => updateHelpVideoAction({ id: video.id, shown: !video.shown }),
      "Couldn't save the video",
      video.shown ? "Hidden from the Help page" : "Shown on the Help page",
      () => updateHelpVideoAction({ id: video.id, shown: video.shown }),
    );
  }

  function remove(video: IHelpVideo) {
    if (!videos) return;
    const order = videos.map((one) => one.id);
    setDeleting(null);
    void change(() => deleteHelpVideoAction({ id: video.id }), "Couldn't delete the video", "Video deleted", async () => {
      const back = await addHelpVideoAction(payloadOf(video));
      if (!back.success || !back.data) return back;
      // Back in its old place.
      return orderHelpVideosAction({ ids: order.map((id) => (id === video.id ? (back.data as IHelpVideo).id : id)) });
    });
  }

  return (
    <Card asChild padding="none" className="overflow-hidden">
      <section aria-labelledby={titleId}>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <span className="flex min-w-0 flex-col gap-0.5">
            <h2 id={titleId} className="text-title text-ink">
              <T>Video guides</T>
            </h2>
            <span className="text-[12.5px] text-ink-muted">
              {videos ? translate("{count} videos · {shown} shown on the Help page", { count: formatCount(videos.length, locale), shown: formatCount(shown, locale) }) : translate("The videos on the Help page.")}
            </span>
          </span>
          {canManage && (
            <Button size="md" variant="action" className="shrink-0 pl-3" onClick={() => setEditing("new")}>
              <Plus aria-hidden="true" strokeWidth={2.25} />
              <T>Add video</T>
            </Button>
          )}
        </div>
        {!videos ? (
          query.isError ? <ErrorState title={translate("Couldn't load the video guides")} onRetry={() => void query.refetch()} /> : <SkeletonRows rows={3} avatar={false} />
        ) : (
          <div className="overflow-x-auto">
            <div role="table" aria-labelledby={titleId} className="min-w-230">
              <div role="row" className={cn(COLUMNS, "border-y border-line bg-strip px-5 py-2.25 text-[12px] font-medium text-ink-muted")}>
                <span role="columnheader">{translate("Order")}</span>
                <span role="columnheader">{translate("Title (English and Bangla)")}</span>
                <span role="columnheader">{translate("Category")}</span>
                <span role="columnheader">{translate("Minutes")}</span>
                <span role="columnheader">{translate("YouTube link")}</span>
                <span role="columnheader">{translate("Show")}</span>
                <span role="columnheader" className="text-right">
                  {translate("Actions")}
                </span>
              </div>
              {videos.map((video, index) => {
                const link = watchLink(video.youtubeId);
                return (
                  <div key={video.id} role="row" className={cn(COLUMNS, "min-h-15 border-b border-divider px-5 py-2 text-[13.5px] transition-colors hover:bg-strip", !video.shown && "opacity-60")}>
                    <span role="cell" className="flex items-center gap-1.5">
                      <span className="w-5.5 font-bold text-ink-2 tabular-nums">{formatCount(index + 1, locale)}</span>
                      <IconAction className="size-7.5" title={translate("Move up")} aria-label={translate('Move "{name}" up', { name: video.titleEn })} disabled={!canManage || busy || index === 0} onClick={() => move(index, -1)}>
                        <ChevronUp aria-hidden="true" strokeWidth={2.25} />
                      </IconAction>
                      <IconAction className="size-7.5" title={translate("Move down")} aria-label={translate('Move "{name}" down', { name: video.titleEn })} disabled={!canManage || busy || index === videos.length - 1} onClick={() => move(index, 1)}>
                        <ChevronDown aria-hidden="true" strokeWidth={2.25} />
                      </IconAction>
                    </span>
                    <span role="cell" className="flex min-w-0 flex-col gap-px">
                      <span className="truncate font-semibold text-ink">{video.titleEn}</span>
                      <span lang={video.titleBn ? "bn" : undefined} className="truncate font-bn text-[13px] text-ink-muted">
                        {video.titleBn || "–"}
                      </span>
                    </span>
                    <span role="cell">
                      <span className={cn("inline-flex rounded-full px-2.25 py-0.5 text-caption font-semibold whitespace-nowrap", CATEGORY_CHIP[video.category])}>{translate(CATEGORY_LABEL[video.category])}</span>
                    </span>
                    <span role="cell" className="text-ink-2 tabular-nums">
                      {translate("{count} min", { count: formatCount(video.minutes, locale) })}
                    </span>
                    <span role="cell" className="min-w-0">
                      <a href={link} target="_blank" rel="noopener noreferrer" title={link} className="flex min-w-0 items-center gap-1.5 text-[13px] text-emerald hover:underline">
                        <YoutubeIcon />
                        <span className="truncate">{link.replace(/^https:\/\/www\./, "")}</span>
                      </a>
                    </span>
                    <span role="cell">
                      <SmallSwitch on={video.shown} disabled={!canManage || busy} label={translate('Show "{name}" on the Help page', { name: video.titleEn })} onClick={() => toggleShown(video)} />
                    </span>
                    <span role="cell" className="flex justify-end gap-1.5">
                      <IconAction title={translate("Edit")} aria-label={translate('Edit "{name}"', { name: video.titleEn })} disabled={!canManage} onClick={() => setEditing(video)}>
                        <Pencil aria-hidden="true" />
                      </IconAction>
                      <IconAction tone="danger" title={translate("Delete")} aria-label={translate('Delete "{name}"', { name: video.titleEn })} disabled={!canManage || busy} onClick={() => setDeleting(video)}>
                        <Trash2 aria-hidden="true" />
                      </IconAction>
                    </span>
                  </div>
                );
              })}
              {videos.length === 0 && <p className="px-5 py-7.5 text-center text-[13.5px] text-ink-muted">{translate("No video guides yet. Add the first one so users see it on the Help page.")}</p>}
            </div>
          </div>
        )}
        <p className="bg-strip px-5 py-2.75 text-[12.5px] text-ink-muted">{translate("Use the arrows to change the order. Users see shown videos in this order on the Help page, with the Bangla title when the app is in Bangla.")}</p>

        {editing !== null && (
          <VideoForm
            key={editing === "new" ? "new" : editing.id}
            video={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={(saved, before) => {
              setEditing(null);
              void refresh();
              toast.success(translate(before ? "Video saved" : "Video added"), {
                action: {
                  label: translate("Undo"),
                  onClick: async () => {
                    const back = before ? await updateHelpVideoAction({ id: before.id, ...payloadOf(before), titleBn: before.titleBn ?? "" }) : await deleteHelpVideoAction({ id: saved.id });
                    if (!back.success) return void toast.error(translate(back.message || "Couldn't undo it"));
                    await refresh();
                  },
                },
              });
            }}
          />
        )}
        <ConfirmDialog
          open={deleting !== null}
          onClose={() => setDeleting(null)}
          onConfirm={() => deleting && remove(deleting)}
          isPending={busy}
          icon={<Trash2 aria-hidden="true" />}
          title={translate("Delete this video guide?")}
          description={translate('"{name}" will be removed from the Help page for every user. You can undo this for a few seconds.', { name: deleting?.titleEn ?? "" })}
          confirmLabel={translate("Delete video")}
          cancelLabel={translate("Keep it")}
        />
      </section>
    </Card>
  );
};

// The board's 560px popup: both titles, the category and minutes, the link
// (it says the video's id once it reads right) and whether it is shown.
function VideoForm({ video, onClose, onSaved }: { video: IHelpVideo | null; onClose: () => void; onSaved: (saved: IHelpVideo, before: IHelpVideo | null) => void }) {
  const { translate } = useLocale();
  const shape = helpVideoFormZodSchema.shape;
  const [pending, setPending] = useState(false);
  const form = useForm({
    defaultValues: {
      titleEn: video?.titleEn ?? "",
      titleBn: video?.titleBn ?? "",
      category: video?.category ?? "GETTING_STARTED",
      minutes: video ? String(video.minutes) : "5",
      youtube: video ? watchLink(video.youtubeId) : "",
      shown: video?.shown ?? true,
    } as IHelpVideoFormValues,
    validators: { onSubmit: helpVideoFormZodSchema },
    onSubmit: async ({ value }) => {
      const payload = { ...value, titleBn: value.titleBn || undefined, minutes: Number(value.minutes) };
      setPending(true);
      const result = video ? await updateHelpVideoAction({ id: video.id, ...payload, titleBn: value.titleBn }) : await addHelpVideoAction(payload);
      setPending(false);
      if (!result.success || !result.data) return void toast.error(translate(result.message || "Couldn't save the video"));
      onSaved(result.data as IHelpVideo, video);
    },
  });

  return (
    <PopupDialog
      open
      onClose={onClose}
      busy={pending}
      width={560}
      title={translate(video ? "Edit video guide" : "Add a video guide")}
      titleClassName="font-bold"
      bodyClassName="gap-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
      footer={
        <>
          <Button type="button" variant="secondary" size="md" disabled={pending} onClick={onClose}>
            <T>Cancel</T>
          </Button>
          <Button type="submit" variant="action" size="md" disabled={pending}>
            <T>{pending ? "Saving..." : video ? "Save video" : "Add video"}</T>
          </Button>
        </>
      }
    >
      <form.Field name="titleEn" validators={{ onChange: shape.titleEn }}>
        {(api) => <AppField field={api} label="Title in English" placeholder="For example: Plan a monthly budget" />}
      </form.Field>
      <form.Field name="titleBn" validators={{ onChange: shape.titleBn }}>
        {(api) => (
          <AppField
            field={api}
            label={
              <>
                {translate("Title in Bangla")} <span className="font-normal text-ink-faint">{translate("(shown when the app is in Bangla)")}</span>
              </>
            }
            placeholder="যেমন: মাসিক বাজেট ঠিক করুন"
            lang="bn"
            className="font-bn"
          />
        )}
      </form.Field>
      <div className="grid grid-cols-[minmax(0,1fr)_140px] gap-3.5">
        <form.Field name="category">
          {(api) => (
            <label className="flex flex-col gap-1.25">
              <span className="text-[13.5px] font-medium text-ink">{translate("Category")}</span>
              <select value={api.state.value} onChange={(event) => api.handleChange(event.target.value as VideoCategory)} className="h-11 rounded-field border border-input bg-surface px-2.5 text-body text-ink outline-none focus:border-primary focus:ring-3 focus:ring-primary/15">
                {VIDEO_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {translate(CATEGORY_LABEL[category])}
                  </option>
                ))}
              </select>
            </label>
          )}
        </form.Field>
        <form.Field name="minutes" validators={{ onChange: shape.minutes }}>
          {(api) => <AppField field={api} label="Minutes" inputMode="numeric" />}
        </form.Field>
      </div>
      <form.Field name="youtube" validators={{ onChange: shape.youtube }}>
        {(api) => {
          const id = youtubeIdOf(api.state.value);
          return (
            <AppField
              field={api}
              label="YouTube link"
              placeholder="https://www.youtube.com/watch?v=..."
              description={
                id ? (
                  <span className="flex items-center gap-1.5 text-income">
                    <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                    {translate("Looks right. Video ID {id}", { id })}
                  </span>
                ) : (
                  translate("A youtube.com/watch, youtu.be, shorts or embed link.")
                )
              }
            />
          );
        }}
      </form.Field>
      <form.Field name="shown">
        {(api) => (
          <div className="flex items-center gap-3.5 rounded-xl border border-line px-3.5 py-3">
            <span className="flex grow flex-col gap-0.5">
              <span className="text-body font-medium text-ink">{translate("Show on the Help page")}</span>
              <span className="text-[12.5px] text-ink-muted">{translate("Turn off to keep it here as a draft.")}</span>
            </span>
            <SmallSwitch on={api.state.value} label={translate("Show on the Help page")} onClick={() => api.handleChange(!api.state.value)} />
          </div>
        )}
      </form.Field>
    </PopupDialog>
  );
}

export default HelpVideosCard;
