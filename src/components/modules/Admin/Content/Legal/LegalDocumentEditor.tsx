"use client";

import { useForm } from "@tanstack/react-form";
import { Heading } from "lucide-react";
import { useRef, useState } from "react";
import { updateLegalDocumentAction } from "@/app/(dashboardLayout)/admin/content/legal/_action";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { Button } from "@/components/ui/button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatRelativeDateTime } from "@/lib/date";
import { toggleHeadingLine } from "@/lib/legalText";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import type { ILegalDocument } from "@/types/legalDocument.types";
import { type ILegalDocumentFormValues, legalDocumentFormZodSchema } from "@/zod/legalDocument.validation";
import { LEGAL_DOC_LABELS, toLegalDocumentFormValues } from "./legalDocumentLabels";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { lowerFirst } from "@/lib/text";

const { shape } = legalDocumentFormZodSchema;

type Language = "contentEn" | "contentBn";

const LANGUAGE_OPTIONS = [
  { value: "contentEn" as const, label: "English" },
  { value: "contentBn" as const, label: "বাংলা", lang: "bn" },
];

interface LegalDocumentEditorProps {
  document: ILegalDocument;
  canManage: boolean;
}

// One document: the live version in its head, the formatting bar, one
// language at a time in the editor, and the foot that publishes the next
// version.
const LegalDocumentEditor = ({ document, canManage }: LegalDocumentEditorProps) => {
  const { translate } = useLocale();
  const label = translate(LEGAL_DOC_LABELS[document.type]);
  const [language, setLanguage] = useState<Language>("contentEn");
  const editors = useRef<Partial<Record<Language, HTMLTextAreaElement | null>>>({});

  const { run, isPending } = useActionMutation({
    action: (values: ILegalDocumentFormValues) => updateLegalDocumentAction(document.type, values),
    successMessage: (saved) => translate("{page} published as version {version}", { page: translate(LEGAL_DOC_LABELS[saved.type]), version: saved.version }),
    invalidateKeys: [queryKeys.legalDocuments.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: toLegalDocumentFormValues(document),
    onSubmit: async ({ value, formApi }) => {
      if (await run(value)) {
        // Re-baseline so "unsaved changes" clears. keepDefaultValues: the
        // props still hold the old version until the refetch lands, and
        // replacing the defaults now would make them snap back to it.
        formApi.reset(value, { keepDefaultValues: true });
      }
    },
  });

  // Heading: "## " at the start of the caret's line, which the public page
  // shows as a section with a place in its "On this page" list.
  function toggleHeading() {
    const editor = editors.current[language];
    if (!editor) return;
    const next = toggleHeadingLine(editor.value, editor.selectionStart);
    form.setFieldValue(language, next.text);
    requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(next.caret, next.caret);
    });
  }

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-col space-y-0 overflow-hidden rounded-lg border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-title text-ink">{label}</h2>
          <span className="text-small text-ink-muted">
            {translate("Live version {version} · updated {when}", {
              version: document.version,
              when: lowerFirst(formatRelativeDateTime(document.updatedAt, { t: translate })),
            })}
          </span>
        </div>
        <SegmentedControl label="Language" variant="tabs" options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
      </div>
      {canManage && (
        <div role="toolbar" aria-label={translate("Formatting")} className="flex gap-0.5 border-b border-surface-sunken px-3 py-2">
          <button
            type="button"
            aria-label={translate("Heading")}
            title={translate("Make this line a section heading (##)")}
            onClick={toggleHeading}
            className="flex size-8 items-center justify-center rounded-sm text-ink-2 transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <Heading className="size-4" strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
      )}
      {LANGUAGE_OPTIONS.map((option) => (
        <form.Field key={option.value} name={option.value} validators={{ onChange: shape[option.value] }}>
          {(field) => (
            <textarea
              ref={(element) => {
                editors.current[option.value] = element;
              }}
              aria-label={`${label}, ${translate(option.label)}`}
              lang={option.lang}
              value={field.state.value ?? ""}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              readOnly={!canManage}
              placeholder={translate(option.value === "contentBn" ? "Not written yet. The app shows the English text until it is." : "The document, as people read it.")}
              className={cn(
                "min-h-90 w-full resize-y bg-transparent px-6 py-5 text-body leading-relaxed text-ink outline-none placeholder:text-ink-faint",
                option.value !== language && "hidden",
              )}
            />
          )}
        </form.Field>
      ))}
      {canManage && (
        <form.Subscribe selector={(state) => [state.isDirty, state.isSubmitting, state.values.contentBn] as const}>
          {([isDirty, isSubmitting, contentBn]) => (
            <div className="flex flex-wrap items-center gap-3 border-t border-line bg-strip px-5 py-3">
              <span className={cn("text-small", contentBn.trim() ? "text-emerald" : "text-warning")}>
                <T>{contentBn.trim() ? "Both languages are written" : "The Bangla version is empty"}</T>
                {isDirty && (
                  <>
                    {" · "}
                    <T>unsaved changes</T>
                  </>
                )}
              </span>
              <span className="flex-1" />
              <Button type="button" variant="outline" size="sm" className="h-9 rounded-md border-line-strong bg-surface text-small font-semibold text-ink hover:bg-surface-sunken" disabled={!isDirty || isPending} onClick={() => form.reset()}>
                <T>Discard</T>
              </Button>
              <AppSubmitButton isPending={isPending || isSubmitting} disabled={!isDirty} pendingLabel="Publishing..." className="h-9 w-auto rounded-md bg-emerald px-4 text-small font-semibold text-white hover:bg-forest">
                <T values={{ version: document.version + 1 }}>{"Publish as version {version}"}</T>
              </AppSubmitButton>
            </div>
          )}
        </form.Subscribe>
      )}
    </AppForm>
  );
};

export default LegalDocumentEditor;
