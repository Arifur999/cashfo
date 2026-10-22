"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { ExternalLink, Heading } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { updateLegalDocumentAction } from "@/app/(dashboardLayout)/admin/content/legal/_action";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import Button from "@/components/smartly/Button";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatRelativeDateTime } from "@/lib/date";
import { formatCount } from "@/lib/i18n/digits";
import { toggleHeadingLine } from "@/lib/legalText";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";
import type { ILegalDocument, LegalDocType } from "@/types/legalDocument.types";
import { type ILegalDocumentFormValues, legalDocumentFormZodSchema } from "@/zod/legalDocument.validation";
import { LEGAL_DOC_LABELS, LEGAL_DOC_ROUTES, legalEditorHeadingId, toLegalDocumentFormValues } from "./legalDocumentLabels";
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
  // Tells the list which documents have edits not yet published.
  onDirtyChange?: (type: LegalDocType, dirty: boolean) => void;
}

// One document: the live version in its head with a link to the page people
// read, the formatting bar, one language at a time in the editor, and the
// foot that publishes the next version.
const LegalDocumentEditor = ({ document, canManage, onDirtyChange }: LegalDocumentEditorProps) => {
  const { locale, translate } = useLocale();
  const label = translate(LEGAL_DOC_LABELS[document.type]);
  const [language, setLanguage] = useState<Language>("contentEn");
  const editors = useRef<Partial<Record<Language, HTMLTextAreaElement | null>>>({});

  const { run, isPending } = useActionMutation({
    action: (values: ILegalDocumentFormValues) => updateLegalDocumentAction(document.type, values),
    successMessage: (saved) => translate("{page} published as version {version}", { page: translate(LEGAL_DOC_LABELS[saved.type]), version: formatCount(saved.version, locale) }),
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

  const isDirty = useStore(form.store, (state) => state.isDirty);
  useEffect(() => {
    onDirtyChange?.(document.type, isDirty);
  }, [onDirtyChange, document.type, isDirty]);

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
          {/* Focused when the document is picked on a phone (see LegalPages). */}
          <h2 id={legalEditorHeadingId(document.type)} tabIndex={-1} className="scroll-mt-4 text-title text-ink focus-visible:outline-offset-4">
            {label}
          </h2>
          <span className="text-small text-ink-muted">
            {translate("Live version {version} · updated {when}", {
              version: formatCount(document.version, locale),
              when: lowerFirst(formatRelativeDateTime(document.updatedAt, { t: translate, locale })),
            })}
          </span>
          <a
            href={LEGAL_DOC_ROUTES[document.type]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1 text-small font-semibold text-emerald hover:underline pointer-coarse:min-h-11"
          >
            {translate("View live page")}
            <ExternalLink className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{translate("(opens in a new tab)")}</span>
          </a>
        </div>
        <SegmentedControl label="Language" variant="tabs" options={LANGUAGE_OPTIONS} value={language} onChange={setLanguage} />
      </div>
      {canManage && (
        <div role="toolbar" aria-label={translate("Formatting")} className="flex gap-0.5 border-b border-divider px-3 py-2">
          <button
            type="button"
            aria-label={translate("Heading")}
            title={translate("Make this line a section heading (##)")}
            onClick={toggleHeading}
            className="flex size-8 items-center justify-center rounded-sm text-ink-2 transition-colors hover:bg-surface-sunken hover:text-ink pointer-coarse:size-11"
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
              // The page's focus ring, drawn inside the card's clipped edge.
              className={cn(
                "min-h-90 w-full resize-y bg-transparent px-6 py-5 text-body leading-relaxed text-ink placeholder:text-ink-faint focus-visible:-outline-offset-2",
                option.value !== language && "hidden",
              )}
            />
          )}
        </form.Field>
      ))}
      {canManage && (
        <form.Subscribe selector={(state) => [state.isDirty, state.isSubmitting, state.values.contentBn] as const}>
          {([dirty, isSubmitting, contentBn]) => (
            <div className="flex flex-wrap items-center gap-3 border-t border-line bg-strip px-5 py-3">
              <span className={cn("text-small", contentBn.trim() ? "text-emerald" : "text-warning")}>
                <T>{contentBn.trim() ? "Both languages are written" : "The Bangla version is empty"}</T>
              </span>
              {dirty && (
                <span className="text-small text-warning">
                  <T>Unsaved changes</T>
                </span>
              )}
              <span className="flex-1" />
              <Button variant="secondary" size="sm" disabled={!dirty || isPending} onClick={() => form.reset()}>
                <T>Discard</T>
              </Button>
              <AppSubmitButton isPending={isPending || isSubmitting} disabled={!dirty} pendingLabel="Publishing..." variant="action" size="sm" className="w-auto">
                {translate("Publish as version {version}", { version: formatCount(document.version + 1, locale) })}
              </AppSubmitButton>
            </div>
          )}
        </form.Subscribe>
      )}
    </AppForm>
  );
};

export default LegalDocumentEditor;
