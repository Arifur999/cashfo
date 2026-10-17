"use client";

import { useForm } from "@tanstack/react-form";
import { useState, useTransition } from "react";
import { replyToTicketAction } from "@/app/(dashboardLayout)/admin/support/_action";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import SelectControl from "@/components/shared/form/SelectControl";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import { TICKET_STATUS_LABEL } from "@/lib/tickets";
import { TICKET_STATUSES, type TicketStatus } from "@/types/ticket.types";
import { type ITicketReplyFormValues, ticketReplyFormZodSchema } from "@/zod/ticket.validation";
import type { ThreadMessage } from "./TicketMessageBubble";
import T from "@/components/shared/T";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { asStatus } from "@/lib/i18n/message";

// Radix Select reserves "" for "no value", so "leave it" needs a token.
const KEEP = "keep";
const AFTER_SEND_OPTIONS = [{ value: KEEP, label: "Leave as is" }, ...TICKET_STATUSES.map((status) => ({ value: status, label: asStatus(TICKET_STATUS_LABEL[status]) }))];

interface TicketReplyFormProps {
  ticketId: string;
  // Who the reply goes to, for the placeholder.
  requesterName: string;
  currentAdminId: string | null;
  // Puts the reply in the thread while it's being sent.
  onSending: (message: ThreadMessage) => void;
  // Applies the "after sending, set to" status once the reply is away.
  onSetStatus?: (status: TicketStatus) => void;
}

// The reply box under the thread, with what to set the ticket to once the
// reply has gone (usually Waiting on user).
const TicketReplyForm = ({ ticketId, requesterName, currentAdminId, onSending, onSetStatus }: TicketReplyFormProps) => {
  const [isSending, startTransition] = useTransition();
  const [afterSend, setAfterSend] = useState<string>(KEEP);
  const { translate } = useLocale();
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
          return;
        }
        if (afterSend !== KEEP) onSetStatus?.(afterSend as TicketStatus);
      });
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit} className="flex flex-col gap-3 space-y-0 border-t border-line px-5 pt-4 pb-5">
      <form.Field name="message" validators={{ onChange: ticketReplyFormZodSchema.shape.message }}>
        {(field) => (
          <AppTextareaField
            field={field}
            label={<span className="sr-only"><T>Reply</T></span>}
            rows={3}
            placeholder={translate("Write a reply to {name}", { name: requesterName })}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !isSending) {
                event.preventDefault();
                void form.handleSubmit();
              }
            }}
          />
        )}
      </form.Field>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-small text-ink-muted"><T>Ctrl + Enter sends.</T></span>
        <span className="flex-1" />
        {onSetStatus && (
          <>
            <span className="text-small text-ink-muted"><T>After sending, set to</T></span>
            <SelectControl ariaLabel="Status after sending" value={afterSend} options={AFTER_SEND_OPTIONS} onValueChange={setAfterSend} size="sm" className="h-9 w-44 rounded-md border-line-strong bg-surface text-small font-semibold text-ink" />
          </>
        )}
        <AppSubmitButton isPending={isSending} pendingLabel="Sending..." className="h-9 w-auto rounded-md bg-emerald px-4 text-body font-semibold text-white hover:bg-forest">
          <T>Send reply</T>
        </AppSubmitButton>
      </div>
    </AppForm>
  );
};

export default TicketReplyForm;
