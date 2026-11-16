"use client";

import { useForm } from "@tanstack/react-form";
import { createSavedReplyAction, updateSavedReplyAction } from "@/app/(dashboardLayout)/admin/support/_action";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import Button from "@/components/smartly/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import type { ISavedReply } from "@/types/ticket.types";
import { type ISavedReplyFormValues, savedReplyFormZodSchema } from "@/zod/ticket.validation";

const { shape } = savedReplyFormZodSchema;

interface SavedReplyFormProps {
  // Editing this one; absent makes a new one.
  reply?: ISavedReply;
  onDone: () => void;
}

// One saved reply: the short name the team picks it by, and its text in
// English and (when written) Bangla. Back returns to the list unsaved.
const SavedReplyForm = ({ reply, onDone }: SavedReplyFormProps) => {
  const { translate } = useLocale();
  const { run, isPending } = useActionMutation({
    action: (values: ISavedReplyFormValues) => (reply ? updateSavedReplyAction(reply.id, values) : createSavedReplyAction(values)),
    successMessage: reply ? "Saved reply updated" : "Saved reply added",
    invalidateKeys: [queryKeys.savedReplies.all],
    refreshRoute: false,
  });
  const form = useForm({
    defaultValues: { title: reply?.title ?? "", bodyEn: reply?.bodyEn ?? "", bodyBn: reply?.bodyBn ?? "" } satisfies ISavedReplyFormValues,
    onSubmit: async ({ value }) => {
      if (await run(value)) onDone();
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-1 flex-col gap-4 space-y-0">
      <form.Field name="title" validators={{ onChange: shape.title }}>
        {(field) => <AppField field={field} label="Name" placeholder="Refund on its way" />}
      </form.Field>
      <form.Field name="bodyEn" validators={{ onChange: shape.bodyEn }}>
        {(field) => <AppTextareaField field={field} label="Reply, English" rows={5} />}
      </form.Field>
      <form.Field name="bodyBn" validators={{ onChange: shape.bodyBn }}>
        {(field) => <AppTextareaField field={field} label="Reply, বাংলা" rows={5} lang="bn" className="font-bn" description="Optional. Without it the English is used." />}
      </form.Field>
      <div className="sticky bottom-0 z-10 -mx-6 mt-auto -mb-4.5 flex justify-end gap-2.5 border-t border-line bg-strip px-6 py-3.5">
        <Button variant="secondary" disabled={isPending} onClick={onDone}>
          {translate("Back")}
        </Button>
        <AppSubmitButton isPending={isPending} pendingLabel="Saving..." variant="action" size="md" className="w-auto">
          {translate(reply ? "Save changes" : "Add reply")}
        </AppSubmitButton>
      </div>
    </AppForm>
  );
};

export default SavedReplyForm;
