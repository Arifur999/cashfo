"use client";

import { useForm } from "@tanstack/react-form";
import { updateLegalDocumentAction } from "@/app/(dashboardLayout)/admin/content/legal/_action";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import SectionCard from "@/components/shared/SectionCard";
import { Button } from "@/components/ui/button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { formatDateTime } from "@/lib/date";
import { formatNumber } from "@/lib/number";
import { queryKeys } from "@/lib/queryKeys";
import type { ILegalDocument } from "@/types/legalDocument.types";
import { type ILegalDocumentFormValues, legalDocumentFormZodSchema } from "@/zod/legalDocument.validation";
import { LEGAL_DOC_LABELS, toLegalDocumentFormValues } from "./legalDocumentLabels";

const { shape } = legalDocumentFormZodSchema;

// The textarea grows with its content; a long document still starts in a
// comfortable, scrollable editing area.
const EDITOR_CLASS_NAME = "max-h-[60vh] min-h-72";

const characterCount = (text: string) => `${formatNumber(text.length)} characters`;

interface LegalDocumentEditorProps {
  document: ILegalDocument;
  canManage: boolean;
}

// English and Bangla side by side; every save publishes the next version.
const LegalDocumentEditor = ({ document, canManage }: LegalDocumentEditorProps) => {
  const label = LEGAL_DOC_LABELS[document.type];

  const { run, isPending } = useActionMutation({
    action: (values: ILegalDocumentFormValues) => updateLegalDocumentAction(document.type, values),
    successMessage: (saved) => `${LEGAL_DOC_LABELS[saved.type]} saved as version ${saved.version}`,
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

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <SectionCard
        title={label}
        action={
          <span className="text-xs text-muted-foreground">
            Version {document.version} &middot; updated {formatDateTime(document.updatedAt)}
          </span>
        }
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <form.Field name="contentEn" validators={{ onChange: shape.contentEn }}>
            {(field) => (
              <AppTextareaField
                field={field}
                label="English"
                readOnly={!canManage}
                description={characterCount(field.state.value)}
                className={EDITOR_CLASS_NAME}
              />
            )}
          </form.Field>
          <form.Field name="contentBn" validators={{ onChange: shape.contentBn }}>
            {(field) => (
              <AppTextareaField
                field={field}
                label="Bangla"
                className={EDITOR_CLASS_NAME}
                readOnly={!canManage}
                placeholder="Not translated yet -- the app shows the English text."
                description={characterCount(field.state.value)}
              />
            )}
          </form.Field>
        </div>

        {canManage && (
          <form.Subscribe selector={(state) => [state.isDirty, state.isSubmitting] as const}>
            {([isDirty, isSubmitting]) => (
              <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                {isDirty && <span className="mr-auto text-xs font-medium text-amber-600 dark:text-amber-400">Unsaved changes</span>}
                <Button type="button" variant="outline" disabled={!isDirty || isPending} onClick={() => form.reset()}>
                  Discard
                </Button>
                <AppSubmitButton isPending={isPending || isSubmitting} disabled={!isDirty} pendingLabel="Saving..." className="w-auto">
                  Save as version {document.version + 1}
                </AppSubmitButton>
              </div>
            )}
          </form.Subscribe>
        )}
      </SectionCard>
    </AppForm>
  );
};

export default LegalDocumentEditor;
