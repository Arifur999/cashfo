"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useId } from "react";
import { updateHelpCompanyAction } from "@/app/(dashboardLayout)/admin/settings/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import Card from "@/components/smartly/Card";
import ErrorState from "@/components/smartly/ErrorState";
import SkeletonRows from "@/components/smartly/SkeletonRows";
import { useActionMutation } from "@/hooks/useActionMutation";
import { DAY_NAME, type WeekDay } from "@/lib/customer/helpPage";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import { adminHelpQuery } from "@/queries/help.queries";
import type { IHelpCompany } from "@/types/help.types";
import { helpCompanyFormZodSchema, type IHelpCompanyFormValues } from "@/zod/help.validation";

const DAYS: WeekDay[] = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
type TextField = "name" | "tagline" | "legalName" | "tradeLicence" | "hotline" | "whatsapp" | "email" | "website" | "facebook" | "youtube" | "headOffice" | "dhakaOffice";

const toFormValues = (company: IHelpCompany): IHelpCompanyFormValues => ({ ...company, replyHours: company.replyHours ? String(company.replyHours) : "" });

// "Company and help page": what users see in Settings › Help & support's
// "Contact the company" card -- who the company is, how to reach it, the
// office hours (the card says Open now or Closed now from them) and the
// average first reply. Only a super admin changes it; every save is in the
// audit log.
const HelpCompanyCard = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const titleId = useId();
  const query = useQuery(adminHelpQuery());
  const company = query.data?.data?.company;

  return (
    <Card asChild padding="none" className="overflow-hidden">
      <section aria-labelledby={titleId}>
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-1">
          <div className="flex min-w-0 flex-1 flex-col gap-0.75">
            <h2 id={titleId} className="text-title text-ink">
              <T>Company and help page</T>
            </h2>
            <p className="text-small leading-normal text-ink-soft">
              <T>{'Users see these in Settings › Help & support, in the "Contact the company" card. Changes show right away.'}</T>
            </p>
          </div>
          <a href="/settings/help" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-small font-semibold text-emerald hover:underline">
            <T>See the user Help page</T>
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
        </div>
        {company ? (
          <CompanyForm key={JSON.stringify(company)} company={company} canManage={canManage} />
        ) : !query.isError ? (
          <SkeletonRows rows={4} avatar={false} />
        ) : (
          <ErrorState title={translate("Couldn't load the company card")} onRetry={() => void query.refetch()} />
        )}
      </section>
    </Card>
  );
};

function CompanyForm({ company, canManage }: { company: IHelpCompany; canManage: boolean }) {
  const { translate } = useLocale();
  const shape = helpCompanyFormZodSchema.shape;
  const { run, isPending } = useActionMutation({
    action: updateHelpCompanyAction,
    successMessage: "Company card saved",
    invalidateKeys: [queryKeys.help.all],
    refreshRoute: false,
  });
  const form = useForm({
    defaultValues: toFormValues(company),
    validators: { onSubmit: helpCompanyFormZodSchema },
    onSubmit: async ({ value, formApi }) => {
      if (await run({ ...value, replyHours: value.replyHours ? Number(value.replyHours) : 0 })) formApi.reset(value, { keepDefaultValues: true });
    },
  });
  const disabled = !canManage;
  const text = (name: TextField, label: string, description?: string, type?: "email" | "tel") => (
    <form.Field name={name} validators={{ onChange: shape[name] }}>
      {(api) => <AppField field={api} label={label} type={type} disabled={disabled} description={description} />}
    </form.Field>
  );
  const group = (title: string, children: React.ReactNode, className?: string) => (
    <fieldset className={cn("grid gap-4 border-t border-divider px-5 pt-4 pb-5 sm:grid-cols-2", className)}>
      <legend className="sr-only">{translate(title)}</legend>
      <span aria-hidden="true" className="text-small font-semibold text-ink-2 sm:col-span-2">
        {translate(title)}
      </span>
      {children}
    </fieldset>
  );

  return (
    <AppForm onSubmit={form.handleSubmit} className="space-y-0">
      {group(
        "Company",
        <>
          {text("name", "Name", "Shown big on the card; the platform name when empty")}
          {text("tagline", "Tagline", "One line under the name")}
          {text("legalName", "Legal name")}
          {text("tradeLicence", "Trade licence number")}
        </>,
        "mt-3",
      )}
      {group(
        "Ways to reach us",
        <>
          {text("hotline", "Hotline", undefined, "tel")}
          {text("whatsapp", "WhatsApp number", undefined, "tel")}
          {text("email", "Email", "The support email when empty", "email")}
          {text("website", "Website")}
          {text("facebook", "Facebook page")}
          {text("youtube", "YouTube channel")}
          {text("headOffice", "Head office")}
          {text("dhakaOffice", "Dhaka office")}
        </>,
      )}
      <fieldset className="flex flex-col gap-4 border-t border-divider px-5 pt-4 pb-5">
        <legend className="sr-only">{translate("Office hours and replies")}</legend>
        <span aria-hidden="true" className="text-small font-semibold text-ink-2">
          {translate("Office hours and replies")}
        </span>
        <form.Field name="openDays">
          {(api) => (
            <div className="flex flex-col gap-1.5">
              <span className="text-small font-medium text-ink">{translate("Open on")}</span>
              <div role="group" aria-label={translate("Open on")} className="flex flex-wrap gap-1.5">
                {DAYS.map((day) => {
                  const on = api.state.value.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={on}
                      disabled={disabled}
                      onClick={() => api.handleChange(on ? api.state.value.filter((one) => one !== day) : [...api.state.value, day])}
                      className={cn("h-8.5 rounded-full border px-3 text-small font-semibold disabled:opacity-60", on ? "border-primary bg-mint-50 text-brand-ink" : "border-line bg-surface text-ink-soft")}
                    >
                      {translate(DAY_NAME[day]).slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </form.Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <form.Field name="opensAt" validators={{ onChange: shape.opensAt }}>
            {(api) => <AppField field={api} label="Opens at" type="time" disabled={disabled} />}
          </form.Field>
          <form.Field name="closesAt" validators={{ onChange: shape.closesAt }}>
            {(api) => <AppField field={api} label="Closes at" type="time" disabled={disabled} />}
          </form.Field>
          <form.Field name="replyHours" validators={{ onChange: shape.replyHours }}>
            {(api) => <AppField field={api} label="Average first reply (hours)" inputMode="numeric" disabled={disabled} description="Empty hides it" />}
          </form.Field>
        </div>
        <span className="text-[12.5px] text-ink-muted">{translate('Times are Dhaka time. The Help page shows "Open now" or "Closed now" from these hours.')}</span>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-strip px-5 py-3">
        <span className="text-small text-ink-muted">
          <T>{canManage ? "Every save goes to the audit log." : "Only a super admin can change these."}</T>
        </span>
        {canManage && (
          <form.Subscribe selector={(state) => [state.isDirty, state.isSubmitting] as const}>
            {([isDirty, isSubmitting]) => (
              <span className="ml-auto flex gap-2">
                <Button variant="secondary" size="md" disabled={!isDirty || isSubmitting} onClick={() => form.reset()}>
                  <T>Discard</T>
                </Button>
                <AppSubmitButton isPending={isPending || isSubmitting} disabled={!isDirty} pendingLabel="Saving..." variant="action" size="md" className="w-auto">
                  <T>Save changes</T>
                </AppSubmitButton>
              </span>
            )}
          </form.Subscribe>
        )}
      </div>
    </AppForm>
  );
}

export default HelpCompanyCard;
