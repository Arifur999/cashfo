"use client";

import { useForm } from "@tanstack/react-form";
import { Send } from "lucide-react";
import { useTransition } from "react";
import { replyToTicketAction } from "@/app/(dashboardLayout)/admin/support/_action";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import { type ITicketReplyFormValues, ticketReplyFormZodSchema } from "@/zod/ticket.validation";
import type { ThreadMessage } from "./TicketMessageBubble";

interface TicketReplyFormProps {
  ticketId: string;
  currentAdminId: string | null;
  // Puts the reply in the thread while it's being sent.
  onSending: (message: ThreadMessage) => void;
}

const TicketReplyForm = ({ ticketId, currentAdminId, onSending }: TicketReplyFormProps) => {
  const [isSending, startTransition] = useTransition();
  const reply = useActionMutation({
    action: (values: ITicketReplyFormValues) => replyToTicketAction(ticketId, values),
    successMessage: "Reply sent",
    invalidateKeys: [queryKeys.tickets.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: { message: "" } satisfies ITicketReplyFormValues,
    onSubmit: ({ value, formApi }) => {
      startTransition(async () => {
        onSending({
          id: `pending-${Date.now()}`,
          ticketId,
          senderType: "ADMIN",
          senderId: currentAdminId ?? "",
          message: value.message.trim(),
          attachmentUrl: null,
          createdAt: new Date().toISOString(),
          isPending: true,
        });
        formApi.reset();
        // Put the text back, so a failed send isn't lost.
        if (!(await reply.run(value))) {
          formApi.setFieldValue("message", value.message);
        }
      });
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit} className="space-y-3">
      <form.Field name="message" validators={{ onChange: ticketReplyFormZodSchema.shape.message }}>
        {(field) => (
          <AppTextareaField
            field={field}
            label="Reply"
            rows={3}
            placeholder="Write a reply..."
            description="Ctrl + Enter to send."
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !isSending) {
                event.preventDefault();
                void form.handleSubmit();
              }
            }}
          />
        )}
      </form.Field>
      <div className="flex justify-end">
        <AppSubmitButton isPending={isSending} pendingLabel="Sending..." className="w-auto">
          <Send aria-hidden="true" /> Send reply
        </AppSubmitButton>
      </div>
    </AppForm>
  );
};

export default TicketReplyForm;
