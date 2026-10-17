"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { updateNotificationTemplateAction } from "@/app/(dashboardLayout)/admin/notifications/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { firstZodError } from "@/lib/formValidators";
import { queryKeys } from "@/lib/queryKeys";
import { fillPlaceholders, getPlaceholderError } from "@/lib/templatePlaceholders";
import { cn } from "@/lib/utils";
import type { INotificationTemplate } from "@/types/notification.types";
import { type INotificationTemplateFormValues, notificationTemplateFormZodSchema } from "@/zod/notification.validation";
import { CHANNEL_META, SAMPLE_VALUES, templateWhen } from "../notificationOptions";
import VariableChips from "./VariableChips";

const { shape } = notificationTemplateFormZodSchema;

type TextField = keyof INotificationTemplateFormValues;

interface TemplateFormProps {
  template: INotificationTemplate;
  canManage: boolean;
}

// The design's template editor: the key and when it goes out, both
// languages side by side, the variables to tap in, and a preview with a
// real-looking person. Every {{placeholder}} must be one of the template's
// declared variables, or users would receive it verbatim.
const TemplateForm = ({ template, canManage }: TemplateFormProps) => {
  const isEmail = template.channel === "EMAIL";
  const { label: channel, chip } = CHANNEL_META[template.channel];
  // Where a tapped variable goes: the field last typed in.
  const [target, setTarget] = useState<TextField>("bodyEn");
  const checkText = (schema: typeof shape.bodyEn) => ({ value }: { value: string }) => firstZodError(schema, value) ?? getPlaceholderError(value, template.variables);

  const { run, isPending } = useActionMutation({
    action: (values: INotificationTemplateFormValues) => updateNotificationTemplateAction(template.id, { ...values, isEmail }),
    successMessage: (saved) => `Saved ${saved.key}`,
    invalidateKeys: [queryKeys.notificationTemplates.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: {
      subjectEn: template.subjectEn ?? "",
      subjectBn: template.subjectBn ?? "",
      bodyEn: template.bodyEn,
      bodyBn: template.bodyBn,
    } satisfies INotificationTemplateFormValues,
    onSubmit: async ({ value, formApi }) => {
      if (await run(value)) formApi.reset(value, { keepDefaultValues: true });
    },
  });

  const insert = (placeholder: string) => {
    const current = form.getFieldValue(target) ?? "";
    form.setFieldValue(target, `${current}${current && !current.endsWith(" ") ? " " : ""}${placeholder}`);
  };

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-col space-y-0 overflow-hidden rounded-lg border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <div className="flex grow flex-col gap-0.5">
          <h2 className="font-mono text-title text-ink">{template.key}</h2>
          <span className="text-small text-ink-muted">
            {channel} · {templateWhen(template.key)}
          </span>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-caption font-semibold", template.isActive ? "bg-mint-50 text-emerald" : "bg-surface-sunken text-ink-2")}>
          {template.isActive ? "On" : "Off"}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-caption font-semibold", chip)}>{channel}</span>
      </div>
      <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
        {isEmail && (
          <>
            <form.Field name="subjectEn" validators={{ onChange: checkText(shape.subjectEn) }}>
              {(field) => (
                <div onFocus={() => setTarget("subjectEn")}>
                  <AppField field={field} label="Subject, English" size="sm" disabled={!canManage} />
                </div>
              )}
            </form.Field>
            <form.Field name="subjectBn" validators={{ onChange: checkText(shape.subjectBn) }}>
              {(field) => (
                <div onFocus={() => setTarget("subjectBn")}>
                  <AppField field={field} label="Subject, বাংলা" size="sm" className="font-bn" disabled={!canManage} />
                </div>
              )}
            </form.Field>
          </>
        )}
        <form.Field name="bodyEn" validators={{ onChange: checkText(shape.bodyEn) }}>
          {(field) => (
            <div onFocus={() => setTarget("bodyEn")}>
              <AppTextareaField field={field} label="Message, English" rows={5} readOnly={!canManage} />
            </div>
          )}
        </form.Field>
        <form.Field name="bodyBn" validators={{ onChange: checkText(shape.bodyBn) }}>
          {(field) => (
            <div onFocus={() => setTarget("bodyBn")}>
              <AppTextareaField field={field} label="Message, বাংলা" rows={5} className="font-bn" readOnly={!canManage} />
            </div>
          )}
        </form.Field>
      </div>
      {canManage && (
        <div className="px-5 pb-4">
          <VariableChips variables={template.variables} onPick={insert} />
        </div>
      )}
      <form.Subscribe selector={(state) => [state.values.subjectEn, state.values.bodyEn] as const}>
        {([subjectEn, bodyEn]) => (
          <div className="mx-4 mb-4 flex flex-col gap-2 rounded-md border border-line bg-cream p-4">
            <span className="text-caption font-semibold text-ink-muted">Preview with a real user</span>
            {isEmail && <b className="text-body font-semibold text-ink">{fillPlaceholders(subjectEn, SAMPLE_VALUES) || "No subject yet"}</b>}
            <span className="text-body leading-relaxed whitespace-pre-wrap text-ink-2">{fillPlaceholders(bodyEn, SAMPLE_VALUES) || "No message yet"}</span>
          </div>
        )}
      </form.Subscribe>
      {canManage && (
        <form.Subscribe selector={(state) => [state.isDirty, state.isSubmitting] as const}>
          {([isDirty, isSubmitting]) => (
            <div className="flex items-center justify-end gap-3 border-t border-line bg-cream px-5 py-3">
              {isDirty && <span className="mr-auto text-small text-warning">Unsaved changes</span>}
              <AppSubmitButton isPending={isPending || isSubmitting} disabled={!isDirty} pendingLabel="Saving..." className="h-9 w-auto rounded-md bg-emerald px-4 text-small font-semibold text-white hover:bg-forest">
                Save template
              </AppSubmitButton>
            </div>
          )}
        </form.Subscribe>
      )}
    </AppForm>
  );
};

export default TemplateForm;
