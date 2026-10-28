"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import {
  deleteNotificationTemplateAction,
  sendNotificationTemplateTestAction,
  setNotificationTemplateActiveAction,
  updateNotificationTemplateAction,
} from "@/app/(dashboardLayout)/admin/notifications/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import Button from "@/components/smartly/Button";
import { Switch } from "@/components/ui/switch";
import { useActionMutation } from "@/hooks/useActionMutation";
import { firstZodError } from "@/lib/formValidators";
import { formatCount } from "@/lib/i18n/digits";
import { plural } from "@/lib/i18n/message";
import { queryKeys } from "@/lib/queryKeys";
import { fillPlaceholders, getPlaceholderError } from "@/lib/templatePlaceholders";
import type { INotificationTemplate } from "@/types/notification.types";
import { type INotificationTemplateFormValues, notificationTemplateFormZodSchema } from "@/zod/notification.validation";
import { CHANNEL_META, SAMPLE_VALUES, templateWhen } from "../notificationOptions";
import { insertAtCaret, sameTemplateText, smsLength } from "./templateText";
import TemplateTextField, { type TextControl } from "./TemplateTextField";
import VariableChips from "./VariableChips";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { Mail, Trash2 } from "lucide-react";

const { shape } = notificationTemplateFormZodSchema;

type TextField = keyof INotificationTemplateFormValues;

const FIELD_LABEL: Record<TextField, string> = {
  subjectEn: "Subject, English",
  subjectBn: "Subject, বাংলা",
  bodyEn: "Message, English",
  bodyBn: "Message, বাংলা",
};


export const toTemplateFormValues = (template: INotificationTemplate): INotificationTemplateFormValues => ({
  subjectEn: template.subjectEn ?? "",
  subjectBn: template.subjectBn ?? "",
  bodyEn: template.bodyEn,
  bodyBn: template.bodyBn,
});

interface TemplateFormProps {
  template: INotificationTemplate;
  canManage: boolean;
  // Wording left unsaved here on an earlier visit, picked up again.
  draft?: INotificationTemplateFormValues;
  // Hands the unsaved wording (or null once there is none) to the list,
  // which marks it and keeps it while another template is open.
  onDraftChange: (templateId: string, draft: INotificationTemplateFormValues | null) => void;
  // The heading's id, so the list can bring the editor into view.
  headingId: string;
}

// The design's template editor: the key and when it goes out, both
// languages side by side, the variables to tap in where the caret is, and
// a preview with sample values in either language. Every {{placeholder}}
// must be one of the template's declared variables, or users would receive
// it verbatim.
const TemplateForm = ({ template, canManage, draft, onDraftChange, headingId }: TemplateFormProps) => {
  const { locale, translate } = useLocale();
  const isEmail = template.channel === "EMAIL";
  const isSms = template.channel === "SMS";
  const { label: channel } = CHANNEL_META[template.channel];
  const saved = useMemo(() => toTemplateFormValues(template), [template]);
  // This visit starts from the draft, if one was left; otherwise from the
  // saved wording, which an untouched form keeps following.
  const [startingDraft] = useState(draft);
  // Where a tapped variable goes: the field last focused, at its caret.
  const [target, setTarget] = useState<TextField>("bodyEn");
  const controls = useRef<Partial<Record<TextField, TextControl>>>({});
  const [previewLanguage, setPreviewLanguage] = useState<"en" | "bn">("en");
  const [isActive, setOptimisticActive] = useOptimistic(template.isActive);
  const [isSwitching, startSwitch] = useTransition();

  // One sentence with the names in it, so it reads in Bangla too.
  const checkText =
    (schema: typeof shape.bodyEn) =>
    ({ value }: { value: string }) =>
      firstZodError(schema, value) ?? getPlaceholderError(value, template.variables, translate);

  const { run, isPending } = useActionMutation({
    action: (values: INotificationTemplateFormValues) => updateNotificationTemplateAction(template.id, { ...values, isEmail }),
    successMessage: (savedTemplate) => translate("Saved {key}", { key: savedTemplate.key }),
    invalidateKeys: [queryKeys.notificationTemplates.all],
    refreshRoute: false,
  });

  // The On switch saves at once, apart from the wording, and moves at once.
  const active = useActionMutation({
    action: (nextActive: boolean) => setNotificationTemplateActiveAction(template.id, { isActive: nextActive }),
    successMessage: (savedTemplate) => translate(savedTemplate.isActive ? "{key} is on" : "{key} is off", { key: savedTemplate.key }),
    invalidateKeys: [queryKeys.notificationTemplates.all],
    refreshRoute: false,
  });

  // "Send a test to me": the template in the language the preview shows.
  const test = useActionMutation({
    action: () => sendNotificationTemplateTestAction(template.id, previewLanguage === "bn" ? "BN" : "EN"),
    successMessage: (result) => translate("Test sent to {email}", { email: result.sentTo }),
    refreshRoute: false,
  });

  // A template made in the panel can go; a built-in one is turned off instead.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const remove = useActionMutation({
    action: () => deleteNotificationTemplateAction(template.id),
    successMessage: translate("Deleted {key}", { key: template.key }),
    invalidateKeys: [queryKeys.notificationTemplates.all],
    refreshRoute: false,
    onSuccess: () => setConfirmDelete(false),
  });

  const form = useForm({
    defaultValues: startingDraft ?? saved,
    onSubmit: async ({ value, formApi }) => {
      if (await run(value)) formApi.reset(value, { keepDefaultValues: true });
    },
  });

  // Unsaved: the wording differs from what the server holds.
  const values = useStore(form.store, (state) => state.values);
  const unsaved = !sameTemplateText(values, saved);
  useEffect(() => {
    onDraftChange(template.id, unsaved ? values : null);
  }, [onDraftChange, template.id, unsaved, values]);

  const focusControl = (name: TextField) => (control: TextControl) => {
    controls.current[name] = control;
    setTarget(name);
  };

  const insert = (placeholder: string) => {
    const control = controls.current[target];
    const current = form.getFieldValue(target) ?? "";
    const start = control?.selectionStart ?? current.length;
    const next = insertAtCaret(current, start, control?.selectionEnd ?? start, placeholder);
    form.setFieldValue(target, next.text);
    requestAnimationFrame(() => {
      control?.focus();
      control?.setSelectionRange(next.caret, next.caret);
    });
  };

  // "142 characters · 3 SMS", as the preview's sample values would send.
  const smsHint = (text: string) => {
    const { characters, parts } = smsLength(fillPlaceholders(text, SAMPLE_VALUES));
    if (characters === 0) return undefined;
    return plural(translate, characters, "{count} character · {parts} SMS", "{count} characters · {parts} SMS", { count: formatCount(characters, locale), parts: formatCount(parts, locale) });
  };

  const bangla = previewLanguage === "bn";
  const previewSubject = fillPlaceholders(bangla ? values.subjectBn : values.subjectEn, SAMPLE_VALUES);
  const previewBody = fillPlaceholders(bangla ? values.bodyBn : values.bodyEn, SAMPLE_VALUES);

  return (
    // uniqueIds: two templates can be open side by side without their
    // fields sharing ids.
    <AppForm uniqueIds onSubmit={form.handleSubmit} className="flex flex-col space-y-0 overflow-hidden rounded-card border border-line-card bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4.5 py-3.5">
        <div className="flex grow flex-col gap-0.5">
          {/* Focused when the template is picked on a phone (see TemplatesEditor). */}
          <h2 id={headingId} tabIndex={-1} className="scroll-mt-4 font-mono text-title text-ink focus-visible:outline-offset-4">
            {template.key}
          </h2>
          <span className="text-[12.5px] leading-[normal] text-ink-muted">
            <T>{channel}</T> · <T>{templateWhen(template.key)}</T>
          </span>
        </div>
        {/* The design's On switch: an off template can't be sent. Named the
            same either way; its state says on or off. */}
        <label className="flex items-center gap-2 text-small text-ink-2">
          <T>{isActive ? "On" : "Off"}</T>
          <Switch
            checked={isActive}
            disabled={!canManage || isSwitching}
            onCheckedChange={(checked) =>
              startSwitch(async () => {
                setOptimisticActive(checked);
                await active.run(checked);
              })
            }
            aria-label={translate("Send {key}", { key: template.key })}
            className="data-checked:bg-emerald data-unchecked:bg-line-strong"
          />
        </label>
      </div>
      <div className="grid gap-3.5 px-4.5 py-4 sm:grid-cols-2">
        {isEmail && (
          <>
            <form.Field name="subjectEn" validators={{ onChange: checkText(shape.subjectEn) }}>
              {(field) => <TemplateTextField field={field} label={FIELD_LABEL.subjectEn} readOnly={!canManage} onFocusControl={focusControl("subjectEn")} />}
            </form.Field>
            <form.Field name="subjectBn" validators={{ onChange: checkText(shape.subjectBn) }}>
              {(field) => <TemplateTextField field={field} label={FIELD_LABEL.subjectBn} lang="bn" readOnly={!canManage} onFocusControl={focusControl("subjectBn")} />}
            </form.Field>
          </>
        )}
        <form.Field name="bodyEn" validators={{ onChange: checkText(shape.bodyEn) }}>
          {(field) => (
            <TemplateTextField
              field={field}
              label={FIELD_LABEL.bodyEn}
              multiline
              readOnly={!canManage}
              onFocusControl={focusControl("bodyEn")}
              hint={isSms ? smsHint(values.bodyEn) : undefined}
            />
          )}
        </form.Field>
        <form.Field name="bodyBn" validators={{ onChange: checkText(shape.bodyBn) }}>
          {(field) => (
            <TemplateTextField
              field={field}
              label={FIELD_LABEL.bodyBn}
              multiline
              lang="bn"
              readOnly={!canManage}
              onFocusControl={focusControl("bodyBn")}
              hint={isSms ? smsHint(values.bodyBn) : undefined}
            />
          )}
        </form.Field>
      </div>
      {canManage && (
        <div className="px-4.5 pb-3.5">
          <VariableChips variables={template.variables} targetLabel={translate(FIELD_LABEL[target])} onPick={insert} />
        </div>
      )}
      <div className="mx-4.5 mb-4 flex flex-col gap-2 rounded-[14px] border border-line bg-strip p-3.5">
        {/* "Preview with sample values · English": the language is a switch. */}
        <span className="text-caption font-semibold tracking-[0.05em] text-ink-muted uppercase">
          {translate("Preview with sample values")} ·{" "}
          <button
            type="button"
            onClick={() => setPreviewLanguage((language) => (language === "en" ? "bn" : "en"))}
            aria-label={translate("Preview language: {language}. Switch", { language: previewLanguage === "en" ? "English" : "বাংলা" })}
            className="uppercase underline decoration-dotted underline-offset-3 hover:text-ink"
          >
            {previewLanguage === "en" ? "English" : <span lang="bn" className="font-bn">বাংলা</span>}
          </button>
        </span>
        {isEmail && (
          <b lang={bangla ? "bn" : undefined} className={cn("text-body font-semibold text-ink", bangla && "font-bn")}>
            {previewSubject || <T>No subject yet</T>}
          </b>
        )}
        <span lang={bangla ? "bn" : undefined} className={cn("text-body leading-[1.55] whitespace-pre-wrap text-ink-2", bangla && "font-bn")}>
          {previewBody || <T>No message yet</T>}
        </span>
      </div>
      {canManage && (
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-strip px-4.5 py-3">
              {/* Emails the admin this template, filled in for them. */}
              <Button variant="secondary" size="sm" className="text-small" onClick={() => test.run(undefined)} disabled={test.isPending} aria-busy={test.isPending || undefined}>
                <Mail className="size-3.75" aria-hidden="true" />
                {translate(test.isPending ? "Sending..." : "Send a test to me")}
              </Button>
              {!template.builtIn && (
                <Button variant="ghost" size="sm" className="text-small text-expense hover:bg-expense-soft" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-3.75" aria-hidden="true" />
                  {translate("Delete")}
                </Button>
              )}
              <span className="mr-auto" />
              {unsaved && <span className="text-small text-warning"><T>Unsaved changes</T></span>}
              <AppSubmitButton isPending={isPending || isSubmitting} disabled={!unsaved} pendingLabel="Saving..." variant="action" size="sm" className="w-auto">
                <T>Save template</T>
              </AppSubmitButton>
            </div>
          )}
        </form.Subscribe>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(open) => !open && !remove.isPending && setConfirmDelete(false)}
        title={translate("Delete {key}?", { key: template.key })}
        description={translate("It goes from the list for good. Campaigns already sent with it keep their record.")}
        confirmLabel={translate("Delete template")}
        pendingLabel="Deleting..."
        variant="destructive"
        isPending={remove.isPending}
        onConfirm={() => remove.run(undefined)}
      />
    </AppForm>
  );
};

export default TemplateForm;
