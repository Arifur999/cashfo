"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { updateHelpCompanyAction } from "@/app/(dashboardLayout)/admin/settings/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import { getFieldError } from "@/components/shared/form/FormFieldShell";
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
import { officeHoursText } from "./helpPreview";
import { lastChangeText, type LastChange } from "./lastChange";

// The board's day row starts on Saturday, as the Bangladeshi week does.
const DAYS: WeekDay[] = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
type TextField = "name" | "legalName" | "tagline" | "taglineBn" | "tradeLicence" | "website" | "hotline" | "whatsapp" | "email" | "facebook" | "youtube" | "headOffice" | "dhakaOffice";
type FieldSpec = { name: TextField; label: string; type?: "email" | "tel"; placeholder?: string; help?: string; wide?: boolean; lang?: string };

const COMPANY: FieldSpec[] = [
  { name: "name", label: "Brand name" },
  { name: "legalName", label: "Legal name" },
  { name: "tagline", label: "Tagline in English" },
  { name: "taglineBn", label: "Tagline in Bangla", lang: "bn" },
  { name: "tradeLicence", label: "Trade licence no.", help: "Shown at the bottom of the contact card." },
  { name: "website", label: "Website", placeholder: "https://" },
];
const REACH: FieldSpec[] = [
  { name: "hotline", label: "Hotline phone", type: "tel", placeholder: "+880 9612-345678", help: "Users tap it to call." },
  { name: "whatsapp", label: "WhatsApp number", type: "tel", placeholder: "+880 1711-234567", help: "Opens a WhatsApp chat." },
  { name: "email", label: "Support email", type: "email", help: "Same as Support email in General." },
  { name: "facebook", label: "Facebook page", placeholder: "https://facebook.com/..." },
  { name: "youtube", label: "YouTube channel", placeholder: "https://youtube.com/@..." },
  { name: "headOffice", label: "Head office address" },
  { name: "dhakaOffice", label: "Dhaka office address", wide: true },
];

// The small grey capitals over each group of fields.
const EYEBROW = "text-[12px] font-semibold tracking-[0.04em] text-ink-faint uppercase";

const toFormValues = (company: IHelpCompany): IHelpCompanyFormValues => ({
  name: company.name,
  legalName: company.legalName,
  tagline: company.tagline,
  // An older API sends no Bangla tagline.
  taglineBn: company.taglineBn ?? "",
  tradeLicence: company.tradeLicence,
  website: company.website,
  hotline: company.hotline,
  whatsapp: company.whatsapp,
  email: company.email,
  facebook: company.facebook,
  youtube: company.youtube,
  headOffice: company.headOffice,
  dhakaOffice: company.dhakaOffice,
  openDays: company.openDays,
  opensAt: company.opensAt,
  closesAt: company.closesAt,
  replyHours: company.replyHours ? String(company.replyHours) : "",
});

// "Company and help page" as the v16 board lays it out: who the company is,
// how to reach it, and the office hours with the average first reply --
// what users see in Settings › Help & support's "Contact the company" card
// (it says Open now or Closed now from the hours). The support email is
// General's own, so saving one here changes it there too. Only a super
// admin changes it; every save is in the audit log.
const HelpCompanyCard = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const titleId = useId();
  const query = useQuery(adminHelpQuery());
  const help = query.data?.data;

  return (
    <Card asChild padding="none" className="overflow-hidden">
      <section aria-labelledby={titleId}>
        {help ? (
          <CompanyForm key={JSON.stringify(help.company)} titleId={titleId} company={help.company} lastChange={help.lastChange} canManage={canManage} />
        ) : (
          <>
            <CardHead titleId={titleId} dirty={false} />
            {!query.isError ? <SkeletonRows rows={4} avatar={false} /> : <ErrorState title={translate("Couldn't load the company card")} onRetry={() => void query.refetch()} />}
          </>
        )}
      </section>
    </Card>
  );
};

function CardHead({ titleId, dirty }: { titleId: string; dirty: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-1">
      <span className="flex min-w-0 flex-col gap-0.5">
        <h2 id={titleId} className="text-title text-ink">
          <T>Company and help page</T>
        </h2>
        <span className="text-[12.5px] text-ink-muted">
          <T>{'Users see these in Settings › Help & support, in the "Contact the company" card. Changes show right away.'}</T>
        </span>
      </span>
      {dirty && (
        <span className="shrink-0 rounded-full bg-warning-soft px-2.25 py-0.5 text-caption font-semibold whitespace-nowrap text-warning">
          <T>Not saved</T>
        </span>
      )}
    </div>
  );
}

function CompanyForm({ titleId, company, lastChange, canManage }: { titleId: string; company: IHelpCompany; lastChange: LastChange | null | undefined; canManage: boolean }) {
  const { translate, locale } = useLocale();
  const shape = helpCompanyFormZodSchema.shape;
  const { run, isPending } = useActionMutation({
    action: updateHelpCompanyAction,
    successMessage: "Company details saved. The Help page is updated.",
    // The support email is General's too.
    invalidateKeys: [queryKeys.help.all, queryKeys.settings.all],
    refreshRoute: false,
  });
  const form = useForm({
    defaultValues: toFormValues(company),
    validators: { onSubmit: helpCompanyFormZodSchema },
    onSubmit: async ({ value, formApi }) => {
      if (await run({ ...value, replyHours: Number(value.replyHours) })) formApi.reset(value, { keepDefaultValues: true });
    },
  });
  const disabled = !canManage;
  const field = ({ name, label, type, placeholder, help, wide, lang }: FieldSpec) => (
    <form.Field key={name} name={name} validators={{ onChange: shape[name] }}>
      {(api) => (
        <div className={cn("min-w-0", wide && "sm:col-span-2")}>
          <AppField field={api} label={label} type={type} placeholder={placeholder} description={help} disabled={disabled} lang={lang} className={lang === "bn" ? "font-bn" : undefined} />
        </div>
      )}
    </form.Field>
  );

  return (
    <AppForm onSubmit={form.handleSubmit} className="space-y-0">
      <form.Subscribe selector={(state) => state.isDirty}>{(dirty) => <CardHead titleId={titleId} dirty={dirty} />}</form.Subscribe>
      <div className="flex flex-col gap-1.5 px-5 pt-3 pb-4.5">
        <span className={cn(EYEBROW, "pt-1")}>{translate("Company")}</span>
        <div className="grid gap-x-4.5 gap-y-3.5 sm:grid-cols-2">{COMPANY.map(field)}</div>
        <span className={cn(EYEBROW, "pt-3.5")}>{translate("Ways to reach us")}</span>
        <div className="grid gap-x-4.5 gap-y-3.5 sm:grid-cols-2">{REACH.map(field)}</div>
        <span className={cn(EYEBROW, "pt-3.5")}>{translate("Office hours and replies")}</span>
        <form.Field name="openDays" validators={{ onChange: shape.openDays }}>
          {(api) => {
            const error = getFieldError(api);
            return (
              <div className="flex flex-col gap-1.5">
                <span className="text-[13.5px] font-medium text-ink">{translate("Open on")}</span>
                <div role="group" aria-label={translate("Office days")} className="flex flex-wrap gap-1.5">
                  {DAYS.map((day) => {
                    const on = api.state.value.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        aria-label={translate(DAY_NAME[day])}
                        disabled={disabled}
                        onClick={() => api.handleChange(on ? api.state.value.filter((one) => one !== day) : [...api.state.value, day])}
                        className={cn(
                          "h-8.5 min-w-14.5 rounded-full border px-3 text-[13px] font-semibold whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-60 pointer-coarse:h-11",
                          on ? "border-mint-200 bg-emerald-soft text-emerald" : "border-line bg-surface text-ink-muted hover:bg-surface-sunken",
                        )}
                      >
                        {translate(DAY_NAME[day]).slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
                {error && (
                  <span role="alert" className="text-[12.5px] text-expense">
                    {translate(error)}
                  </span>
                )}
                <form.Subscribe selector={(state) => [state.values.openDays, state.values.opensAt, state.values.closesAt] as const}>
                  {([days, opens, closes]) => <span className="text-[12px] text-ink-muted">{translate("Users see: {hours}", { hours: officeHoursText(days, opens, closes, translate, locale) })}</span>}
                </form.Subscribe>
              </div>
            );
          }}
        </form.Field>
        <div className="grid gap-x-4.5 gap-y-3.5 pt-1.5 sm:grid-cols-3">
          <form.Field name="opensAt" validators={{ onChange: shape.opensAt }}>
            {(api) => <AppField field={api} label="Opens at" type="time" disabled={disabled} />}
          </form.Field>
          <form.Field name="closesAt" validators={{ onChange: shape.closesAt }}>
            {(api) => <AppField field={api} label="Closes at" type="time" disabled={disabled} />}
          </form.Field>
          <form.Field name="replyHours" validators={{ onChange: shape.replyHours }}>
            {(api) => <AppField field={api} label="Average first reply" inputMode="numeric" disabled={disabled} append={<span className="text-[13px] text-ink-muted">{translate("hours")}</span>} />}
          </form.Field>
        </div>
        <span className="text-[12px] text-ink-muted">{translate('Times are Dhaka time. The Help page shows "Open now" or "Closed now" from these hours.')}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-strip px-5 py-3 sm:flex-nowrap">
        <span className="min-w-0 flex-1 basis-60 text-[12.5px] text-ink-muted">
          {lastChangeText(lastChange, translate, locale, true)} <T>{canManage ? "Users see changes right away." : "Only super admins can change these."}</T>
        </span>
        {canManage && (
          <form.Subscribe selector={(state) => [state.isDirty, state.isSubmitting] as const}>
            {([isDirty, isSubmitting]) => (
              <span className="ml-auto flex shrink-0 gap-2">
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
