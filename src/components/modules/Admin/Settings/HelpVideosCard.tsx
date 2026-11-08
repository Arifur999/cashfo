"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { addHelpVideoAction, deleteHelpVideoAction, orderHelpVideosAction, updateHelpVideoAction } from "@/app/(dashboardLayout)/admin/settings/_action";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import ErrorState from "@/components/smartly/ErrorState";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useActionMutation } from "@/hooks/useActionMutation";
import { CATEGORY_LABEL, VIDEO_CATEGORIES, youtubeIdOf } from "@/lib/customer/helpPage";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { adminHelpQuery } from "@/queries/help.queries";
import type { IHelpVideo } from "@/types/help.types";
import { helpVideoFormZodSchema, type IHelpVideoFormValues } from "@/zod/help.validation";

const ICON_BUTTON = "flex size-8 items-center justify-center rounded-lg border border-line text-ink-soft hover:bg-surface-sunken hover:text-ink disabled:opacity-40";

// "Video guides": the YouTube videos users see on the Help page, in this
// order, with the Bangla title when the app is in Bangla. A hidden one
// stays here as a draft. Add, change, reorder (the arrows) and delete (with
// an undo); only a super admin changes them, and every change is in the
// audit log.
const HelpVideosCard = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const titleId = useId();
  const client = useQueryClient();
  const query = useQuery(adminHelpQuery());
  const videos = query.data?.data?.videos;
  const [editing, setEditing] = useState<IHelpVideo | "new" | null>(null);
  const [deleting, setDeleting] = useState<IHelpVideo | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.help.all });
  const shown = videos?.filter((video) => video.shown).length ?? 0;

  async function move(index: number, step: -1 | 1) {
    if (!videos || busy) return;
    const ids = videos.map((video) => video.id);
    [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
    setBusy(true);
    const result = await orderHelpVideosAction({ ids });
    setBusy(false);
    if (!result.success) return void toast.error(translate(result.message || "Couldn't save the order"));
    await refresh();
  }

  async function toggleShown(video: IHelpVideo) {
    setBusy(true);
    const result = await updateHelpVideoAction({ id: video.id, shown: !video.shown });
    setBusy(false);
    if (!result.success) return void toast.error(translate(result.message || "Couldn't save the video"));
    toast.success(translate(video.shown ? "Hidden from the Help page" : "Shown on the Help page"));
    await refresh();
  }

  async function remove(video: IHelpVideo) {
    if (!videos) return;
    const order = videos.map((one) => one.id);
    setBusy(true);
    const result = await deleteHelpVideoAction({ id: video.id });
    setBusy(false);
    setDeleting(null);
    if (!result.success) return void toast.error(translate(result.message || "Couldn't delete the video"));
    await refresh();
    toast.success(translate("Video guide deleted"), {
      action: {
        label: translate("Undo"),
        onClick: async () => {
          const back = await addHelpVideoAction({ titleEn: video.titleEn, titleBn: video.titleBn ?? undefined, category: video.category, minutes: video.minutes, youtube: video.youtubeId, shown: video.shown });
          if (!back.success || !back.data) return void toast.error(translate(back.message || "Couldn't add the video"));
          // Back in its old place.
          await orderHelpVideosAction({ ids: order.map((id) => (id === video.id ? back.data!.id : id)) });
          await refresh();
          toast.success(translate("Video guide is back"));
        },
      },
    });
  }

  return (
    <Card asChild padding="none" className="overflow-hidden">
      <section aria-labelledby={titleId}>
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.75">
            <h2 id={titleId} className="text-title text-ink">
              <T>Video guides</T>
            </h2>
            <p className="text-small leading-normal text-ink-soft">{videos ? translate("{shown} shown on the Help page · {drafts} drafts", { shown: String(shown), drafts: String(videos.length - shown) }) : translate("The videos on the Help page.")}</p>
          </div>
          {canManage && (
            <Button size="md" variant="action" onClick={() => setEditing("new")}>
              <Plus aria-hidden="true" />
              <T>Add video</T>
            </Button>
          )}
        </div>
        {!videos ? (
          query.isError ? <ErrorState title={translate("Couldn't load the video guides")} onRetry={() => void query.refetch()} /> : <SkeletonRows rows={3} avatar={false} />
        ) : videos.length === 0 ? (
          <p className="border-t border-divider px-5 py-6 text-small text-ink-muted">{translate("No video guides yet. Add the first one so users see it on the Help page.")}</p>
        ) : (
          <div className="overflow-x-auto border-t border-divider">
            <table className="w-full min-w-170 text-left text-small">
              <thead className="bg-strip text-[12px] font-semibold text-ink-muted">
                <tr>
                  <th className="px-5 py-2.5">{translate("Order")}</th>
                  <th className="px-3 py-2.5">{translate("Title (English and Bangla)")}</th>
                  <th className="px-3 py-2.5">{translate("Category")}</th>
                  <th className="px-3 py-2.5">{translate("Minutes")}</th>
                  <th className="px-3 py-2.5">{translate("YouTube link")}</th>
                  <th className="px-3 py-2.5">{translate("Show")}</th>
                  <th className="px-5 py-2.5 text-right">{translate("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video, index) => (
                  <tr key={video.id} className={cn("border-t border-divider", !video.shown && "text-ink-muted")}>
                    <td className="px-5 py-2.5">
                      <span className="flex items-center gap-1">
                        <span className="w-5 font-semibold tabular-nums">{index + 1}</span>
                        <button type="button" className={ICON_BUTTON} aria-label={translate("Move up")} disabled={!canManage || busy || index === 0} onClick={() => void move(index, -1)}>
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                        </button>
                        <button type="button" className={ICON_BUTTON} aria-label={translate("Move down")} disabled={!canManage || busy || index === videos.length - 1} onClick={() => void move(index, 1)}>
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex flex-col">
                        <span className="font-semibold text-ink">{video.titleEn}</span>
                        {video.titleBn && <span className="text-[12.5px] text-ink-muted">{video.titleBn}</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{translate(CATEGORY_LABEL[video.category] ?? "Other")}</td>
                    <td className="px-3 py-2.5 tabular-nums">{video.minutes}</td>
                    <td className="px-3 py-2.5">
                      <a href={`https://youtu.be/${video.youtubeId}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[12.5px] text-emerald hover:underline">
                        youtu.be/{video.youtubeId}
                      </a>
                    </td>
                    <td className="px-3 py-2.5">
                      <Switch checked={video.shown} disabled={!canManage || busy} onCheckedChange={() => void toggleShown(video)} aria-label={translate("Show on the Help page")} />
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="flex justify-end gap-1">
                        <button type="button" className={ICON_BUTTON} aria-label={translate("Edit {name}", { name: video.titleEn })} disabled={!canManage} onClick={() => setEditing(video)}>
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </button>
                        <button type="button" className={cn(ICON_BUTTON, "hover:text-expense")} aria-label={translate("Delete {name}", { name: video.titleEn })} disabled={!canManage || busy} onClick={() => setDeleting(video)}>
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-divider bg-strip px-5 py-3 text-[12.5px] text-ink-muted">{translate("Use the arrows to change the order. Users see shown videos in this order on the Help page, with the Bangla title when the app is in Bangla.")}</p>

        <FormDrawer open={editing !== null} onOpenChange={(open) => !open && setEditing(null)} title={translate(editing === "new" ? "Add a video guide" : "Edit the video guide")}>
          {editing !== null && <VideoForm key={editing === "new" ? "new" : editing.id} video={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
        </FormDrawer>
        <ConfirmDialog
          open={deleting !== null}
          onClose={() => setDeleting(null)}
          onConfirm={() => deleting && void remove(deleting)}
          isPending={busy}
          title={translate("Delete this video guide?")}
          description={translate('"{name}" will be removed from the Help page for every user. You can undo this for a few seconds.', { name: deleting?.titleEn ?? "" })}
          confirmLabel={translate("Delete video")}
          cancelLabel={translate("Keep it")}
        />
      </section>
    </Card>
  );
};

function VideoForm({ video, onDone }: { video: IHelpVideo | null; onDone: () => void }) {
  const { translate } = useLocale();
  const shape = helpVideoFormZodSchema.shape;
  const { run, isPending } = useActionMutation<Record<string, unknown>, unknown>({
    action: (values) => (video ? updateHelpVideoAction({ id: video.id, ...values }) : addHelpVideoAction(values)),
    successMessage: video ? "Video guide saved" : "Video guide added",
    invalidateKeys: [queryKeys.help.all],
    refreshRoute: false,
  });
  const form = useForm({
    defaultValues: { titleEn: video?.titleEn ?? "", titleBn: video?.titleBn ?? "", category: video?.category ?? "GETTING_STARTED", minutes: video ? String(video.minutes) : "", youtube: video ? `https://youtu.be/${video.youtubeId}` : "", shown: video?.shown ?? true } as IHelpVideoFormValues,
    validators: { onSubmit: helpVideoFormZodSchema },
    onSubmit: async ({ value }) => {
      if (await run({ ...value, titleBn: value.titleBn || undefined, minutes: Number(value.minutes) })) onDone();
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex min-h-full flex-1 flex-col gap-3.5 space-y-0">
      <form.Field name="titleEn" validators={{ onChange: shape.titleEn }}>
        {(api) => <AppField field={api} label="Title in English" />}
      </form.Field>
      <form.Field name="titleBn" validators={{ onChange: shape.titleBn }}>
        {(api) => <AppField field={api} label="Title in Bangla" description="Shown when the app is in Bangla" />}
      </form.Field>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <form.Field name="category">
          {(api) => (
            <label className="flex flex-col gap-1.5">
              <span className="text-small font-medium text-ink">{translate("Category")}</span>
              <select value={api.state.value} onChange={(event) => api.handleChange(event.target.value as IHelpVideoFormValues["category"])} className="h-11 rounded-field border border-input bg-surface px-3 text-body text-ink">
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
          return <AppField field={api} label="YouTube link" description={api.state.value && id ? translate("Looks right. Video ID {id}", { id }) : translate("A youtube.com/watch, youtu.be, shorts or embed link.")} />;
        }}
      </form.Field>
      <form.Field name="shown">
        {(api) => (
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-3">
            <span className="flex flex-col">
              <span className="text-body font-medium text-ink">{translate("Show on the Help page")}</span>
              <span className="text-[12.5px] text-ink-muted">{translate("Turn off to keep it here as a draft.")}</span>
            </span>
            <Switch checked={api.state.value} onCheckedChange={api.handleChange} aria-label={translate("Show on the Help page")} />
          </label>
        )}
      </form.Field>
      <DialogFooter className="sticky bottom-0 z-10 -mx-6 mt-auto -mb-5 flex-row justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5">
        <DialogClose asChild>
          <Button type="button" variant="secondary" size="md" disabled={isPending}>
            <T>Cancel</T>
          </Button>
        </DialogClose>
        <AppSubmitButton isPending={isPending} pendingLabel="Saving..." variant="action" size="md" className="w-auto">
          <T>{video ? "Save video" : "Add video"}</T>
        </AppSubmitButton>
      </DialogFooter>
    </AppForm>
  );
}

export default HelpVideosCard;
