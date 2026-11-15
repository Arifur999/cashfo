"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { createAnnouncementAction, setAnnouncementEnabledAction, updateAnnouncementAction } from "@/app/(dashboardLayout)/admin/content/announcements/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import Button from "@/components/smartly/Button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { dateTimeInputToIso, formatDate, toDateTimeInputValue } from "@/lib/date";
import { firstZodError } from "@/lib/formValidators";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { planAnalyticsQuery, plansQuery } from "@/queries/plan.queries";
import type { AnnouncementType, IAnnouncement } from "@/types/announcement.types";
import { ALL_PLANS, announcementFormZodSchema, getScheduleError, type IAnnouncementFormValues } from "@/zod/announcement.validation";
import { ANNOUNCEMENT_TYPE_META, buildAudienceOptions } from "./announcementOptions";
import AnnouncementTypeField from "./AnnouncementTypeField";

const { shape } = announcementFormZodSchema;

type When = "now" | "later";
type PreviewLanguage = "en" | "bn";

interface AnnouncementFormProps {
  defaultValues: IAnnouncementFormValues;
  // Editing this announcement; absent means a new one.
  announcement?: IAnnouncement;
  onDone: () => void;
}

// "31 Dec, 9:00 am" from a datetime-local value.
const whenText = (value: string, locale: "en" | "bn") => (value ? formatDate(dateTimeInputToIso(value), "d MMM, h:mm aaa", "", locale) : "");

// The bell row the app draws for it: the kind's tile, the title, the
// message, when, and the unread dot.
function BellPreview({ type, title, body, meta, titleLang, bodyLang }: { type: AnnouncementType; title: string; body: string; meta: string; titleLang?: string; bodyLang?: string }) {
  const { translate } = useLocale();
  const { icon: Icon, chip } = ANNOUNCEMENT_TYPE_META[type];
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
      <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4.25", chip)}>
        <Icon strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.75">
        <span lang={titleLang} className={cn("text-[13.5px] font-bold break-words", title ? "text-ink" : "text-ink-faint", titleLang && "font-bn")}>
          {title || translate("Your title shows here")}
        </span>
        <span lang={bodyLang} className={cn("text-[12.5px] leading-[1.45] break-words whitespace-pre-line text-ink-soft", bodyLang && "font-bn")}>
          {body || translate("Your message shows here.")}
        </span>
        <span className="text-[11.5px] text-ink-faint">{meta}</span>
      </span>
      <span aria-hidden="true" className="mt-1.5 size-2.25 shrink-0 rounded-full bg-expense-fill" />
    </div>
  );
}

// The v16 board's announcement popup: the kind, both languages side by
// side, who gets it and when (now or on a date; once sent, it stays sent),
// how it looks in the bell with how many people get it, and -- kept from
// before the board -- when it ends, its "Try it" link, and turning it off.
// Mounted inside the popup, so each open starts from defaultValues.
const AnnouncementForm = ({ defaultValues, announcement, onDone }: AnnouncementFormProps) => {
  const plans = useQuery(plansQuery()).data?.data;
  const analytics = useQuery(planAnalyticsQuery()).data?.data;
  const { locale, translate } = useLocale();
  const audienceOptions = useMemo(() => buildAudienceOptions(plans ?? [], translate), [plans, translate]);
  const [previewLanguage, setPreviewLanguage] = useState<PreviewLanguage>("en");
  const scheduled = announcement?.status === "SCHEDULED";
  // A sent one's moment has passed; a new or scheduled one picks it.
  const canTime = !announcement || scheduled;
  const [when, setWhen] = useState<When>(scheduled ? "later" : "now");
  const later = canTime && when === "later";
  const done = useRef("");

  // Turning one off (or back on) keeps its schedule; it leaves the bells
  // while off.
  const toggle = useActionMutation({
    action: (isActive: boolean) => setAnnouncementEnabledAction(announcement?.id ?? "", isActive),
    successMessage: (updated) => (updated.isActive ? "Announcement turned on" : "Announcement turned off"),
    invalidateKeys: [queryKeys.announcements.all],
    refreshRoute: false,
    onSuccess: onDone,
  });

  const { run, isPending } = useActionMutation({
    action: (values: IAnnouncementFormValues) => (announcement ? updateAnnouncementAction(announcement.id, values) : createAnnouncementAction(values)),
    successMessage: () => done.current,
    invalidateKeys: [queryKeys.announcements.all],
    refreshRoute: false,
  });

  // How many people get it: everyone, or those on one plan.
  const reach = (targetPlan: string): { count: number; who: string } | null => {
    if (!analytics) return null;
    if (targetPlan === ALL_PLANS) return { count: analytics.summary.totalUsers, who: translate("everyone") };
    const plan = analytics.perPlan.find((entry) => entry.planId === targetPlan);
    return plan ? { count: plan.totalUsers, who: translate("{name} plan", { name: plan.planName }) } : null;
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      // "Send now" sends it at this moment.
      const values = canTime && when === "now" ? { ...value, startAt: toDateTimeInputValue(new Date()) } : value;
      const people = reach(values.targetPlan);
      const count = people ? formatCount(people.count, locale) : "";
      done.current = announcement
        ? later
          ? translate("Schedule updated.")
          : translate("“{title}” is updated in every app.", { title: values.title })
        : later
          ? people
            ? translate("Scheduled for {when}. It goes to the bell in {count} apps then.", { when: whenText(values.startAt, locale), count })
            : translate("Scheduled for {when}.", { when: whenText(values.startAt, locale) })
          : people
            ? translate("Sent. “{title}” is now in the bell of {count} users ({who}).", { title: values.title, count, who: people.who })
            : translate("Sent. “{title}” is now in their bells.", { title: values.title });
      if (await run(values)) onDone();
    },
  });

  const cta = (targetPlan: string) => (announcement ? (later ? "Save schedule" : "Save for everyone") : later ? "Schedule" : targetPlan === ALL_PLANS ? "Send to everyone now" : "Send now");
  const label = (text: string, optional = false) => (
    <>
      {translate(text)}
      {optional && <span className="font-normal text-ink-muted"> {translate("(optional)")}</span>}
    </>
  );

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-1 flex-col gap-4 space-y-0">
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink-2">{translate("Type")}</span>
        <form.Field name="type" validators={{ onChange: shape.type }}>
          {(field) => <AnnouncementTypeField field={field} />}
        </form.Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.Field name="title" validators={{ onChange: shape.title }}>
          {(field) => <AppField field={field} label={label("Title, English")} placeholder="Short and clear" />}
        </form.Field>
        <form.Field name="titleBn" validators={{ onChange: shape.titleBn }}>
          {(field) => <AppField field={field} label={label("Title, বাংলা", true)} placeholder="বাংলা শিরোনাম" lang="bn" className="font-bn" />}
        </form.Field>
        <form.Field name="body" validators={{ onChange: shape.body }}>
          {(field) => <AppTextareaField field={field} label={label("Message, English")} placeholder="What should people know or do?" rows={3} />}
        </form.Field>
        <form.Field name="bodyBn" validators={{ onChange: shape.bodyBn }}>
          {(field) => <AppTextareaField field={field} label={label("Message, বাংলা", true)} placeholder="বাংলা বার্তা" rows={3} lang="bn" className="font-bn" />}
        </form.Field>
      </div>
      <div className={cn("grid items-start gap-3", canTime && "sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]")}>
        <form.Field name="targetPlan" validators={{ onChange: shape.targetPlan }}>
          {(field) => <AppSelectField field={field} label="Send to" options={audienceOptions} />}
        </form.Field>
        {canTime && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-2">{translate("When")}</span>
            <div className="flex gap-2">
              {(["now", "later"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={when === option}
                  onClick={() => setWhen(option)}
                  className={cn(
                    "h-10.5 shrink-0 rounded-field border px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors pointer-coarse:h-11",
                    when === option ? "border-[1.5px] border-emerald bg-emerald-soft text-brand-ink" : "border-input bg-surface text-ink-2 hover:bg-hover",
                  )}
                >
                  {translate(option === "now" ? "Send now" : "Schedule")}
                </button>
              ))}
              {later && (
                <form.Field name="startAt" validators={{ onChange: shape.startAt }}>
                  {(field) => (
                    <div className="min-w-0 grow">
                      <AppField field={field} label={<span className="sr-only">{translate("Send on")}</span>} type="datetime-local" />
                    </div>
                  )}
                </form.Field>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <form.Field
          name="endAt"
          validators={{
            onChangeListenTo: ["startAt"],
            onChange: ({ value, fieldApi }) => firstZodError(shape.endAt, value) ?? getScheduleError(fieldApi.form.getFieldValue("startAt"), value),
          }}
        >
          {(field) => <AppField field={field} label={label("Ends", true)} type="datetime-local" description="The banner leaves the app then; empty keeps it." />}
        </form.Field>
        <form.Field name="linkUrl" validators={{ onChange: shape.linkUrl }}>
          {(field) => <AppField field={field} label={label("“Try it” link", true)} placeholder="/habit-tracker or https://…" />}
        </form.Field>
      </div>
      <form.Subscribe selector={(state) => state.values}>
        {(values) => {
          // The app shows a Bangla reader the English of any part not yet in Bangla.
          const titleBn = previewLanguage === "bn" && values.titleBn.trim() !== "";
          const bodyBn = previewLanguage === "bn" && values.bodyBn.trim() !== "";
          const people = reach(values.targetPlan);
          const at = whenText(values.startAt, locale);
          const lead = people
            ? later
              ? translate("On {when}, about {count} people ({who}) get it in their bell.", { when: at || translate("the date you pick"), count: formatCount(people.count, locale), who: people.who })
              : translate("About {count} people ({who}) get it in their bell right away.", { count: formatCount(people.count, locale), who: people.who })
            : "";
          return (
            <div className="flex flex-col gap-2 rounded-[14px] bg-surface-sunken p-3.5">
              {/* "How it looks in the bell · English": the language is a switch. */}
              <span className="text-[12px] font-semibold tracking-[0.05em] text-ink-muted uppercase">
                {translate("How it looks in the bell")} ·{" "}
                <button
                  type="button"
                  onClick={() => setPreviewLanguage((language) => (language === "en" ? "bn" : "en"))}
                  aria-label={translate("Preview language: {language}. Switch", { language: previewLanguage === "en" ? "English" : "বাংলা" })}
                  className="uppercase underline decoration-dotted underline-offset-3 hover:text-ink"
                >
                  {previewLanguage === "en" ? "English" : <span lang="bn" className="font-bn">বাংলা</span>}
                </button>
              </span>
              <BellPreview
                type={values.type}
                title={(titleBn ? values.titleBn : values.title).trim()}
                body={(bodyBn ? values.bodyBn : values.body).trim()}
                meta={later ? at || translate("Scheduled") : translate("Just now")}
                titleLang={titleBn ? "bn" : undefined}
                bodyLang={bodyBn ? "bn" : undefined}
              />
              <span className="text-[12.5px] text-ink-muted">
                {lead} {translate("Users with Bangla on see the Bangla text.")}
              </span>
            </div>
          );
        }}
      </form.Subscribe>
      <form.Subscribe selector={(state) => [state.values.targetPlan, state.isSubmitting] as const}>
        {([targetPlan, isSubmitting]) => (
          <DialogFooter className="sticky bottom-0 z-10 -mx-6 mt-auto -mb-4.5 flex-row items-center justify-between gap-2.5 border-t border-line bg-strip px-6 py-3.5">
            <div>
              {announcement && (
                <Button
                  variant="ghost"
                  disabled={toggle.isPending || isPending}
                  className={announcement.isActive ? "px-3 text-expense hover:text-expense" : "px-3 text-emerald"}
                  onClick={() => void toggle.run(!announcement.isActive)}
                >
                  {translate(announcement.isActive ? "Turn off" : "Turn on")}
                </Button>
              )}
            </div>
            <div className="flex gap-2.5">
              <DialogClose asChild>
                <Button type="button" variant="secondary" size="md" disabled={isPending}>
                  {translate("Cancel")}
                </Button>
              </DialogClose>
              <AppSubmitButton isPending={isPending || isSubmitting} pendingLabel="Saving..." variant="action" size="md" className="w-auto">
                <Send aria-hidden="true" className="size-4" />
                {translate(cta(targetPlan))}
              </AppSubmitButton>
            </div>
          </DialogFooter>
        )}
      </form.Subscribe>
    </AppForm>
  );
};

export default AnnouncementForm;
