"use client";

import { useForm } from "@tanstack/react-form";
import { useState, useSyncExternalStore, useTransition } from "react";
import { replyToTicketAction } from "@/app/(dashboardLayout)/admin/support/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
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
import { type AfterSendChoice, DEFAULT_AFTER_SEND, initialAfterSend, isAfterSendChoice, KEEP_STATUS, readAfterSendChoice, saveAfterSendChoice, statusToSet, subscribeAfterSendChoice } from "./afterSendChoice";
import { SEND_AND_CLOSE_STATUSES } from "./ticketStatusCopy";

const AFTER_SEND_OPTIONS = [{ value: KEEP_STATUS, label: "Leave as is" }, ...TICKET_STATUSES.map((status) => ({ value: status, label: asStatus(TICKET_STATUS_LABEL[status]) }))];

const closingCopy = (choice: AfterSendChoice, current: TicketStatus) => {
  const next = statusToSet(choice, current);
  return next ? SEND_AND_CLOSE_STATUSES[next] : undefined;
};

interface TicketReplyFormProps {
  ticketId: string;
  // The ticket's status now, so a reply never sets what is already set.
  currentStatus: TicketStatus;
  // Who the reply goes to, for the placeholder.
  requesterName: string;
  currentAdminId: string | null;
  // Puts the reply in the thread while it's being sent.
  onSending: (message: ThreadMessage) => void;
  // Applies the "after sending, set to" status once the reply is away.
  onSetStatus?: (status: TicketStatus) => void;
}

// The reply box under the thread, with what to set the ticket to once the
// reply has gone: Waiting on user to start with, then whatever this admin
// last picked, but "Leave as is" on a solved or closed ticket. Resolving or
// closing asks first, saying the reply goes too.
const TicketReplyForm = ({ ticketId, currentStatus, requesterName, currentAdminId, onSending, onSetStatus }: TicketReplyFormProps) => {
  const [isSending, startTransition] = useTransition();
  // The server can't read this browser's choice, so the first render (and
  // hydration) shows the default and the remembered one follows.
  const remembered = useSyncExternalStore(subscribeAfterSendChoice, readAfterSendChoice, () => DEFAULT_AFTER_SEND);
  // A pick for this reply only (Resolved, Closed), until it is sent.
  const [picked, setPicked] = useState<AfterSendChoice | null>(null);
  const afterSend = picked ?? initialAfterSend(remembered, currentStatus);
  // The reply waiting on "Mark as resolved?" / "Close this ticket?".
  const [confirming, setConfirming] = useState<ITicketReplyFormValues | null>(null);
  const { translate } = useLocale();
  const reply = useActionMutation({
    action: (values: ITicketReplyFormValues) => replyToTicketAction(ticketId, values),
    successMessage: "Reply sent",
    invalidateKeys: [queryKeys.tickets.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: { message: "" } satisfies ITicketReplyFormValues,
    onSubmit: ({ value }) => {
      if (onSetStatus && closingCopy(afterSend, currentStatus)) {
        setConfirming(value);
        return;
      }
      send(value);
    },
  });

  function send(value: ITicketReplyFormValues) {
    const status = afterSend;
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
      form.reset();
      // Put the text back, so a failed send isn't lost.
      if (!(await reply.run(value))) {
        form.setFieldValue("message", value.message);
        return;
      }
      const next = statusToSet(status, currentStatus);
      if (next) onSetStatus?.(next);
      setPicked(null);
    });
  }

  const confirmCopy = closingCopy(afterSend, currentStatus);

  return (
    <>
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
              <SelectControl
                ariaLabel="Status after sending"
                value={afterSend}
                options={AFTER_SEND_OPTIONS}
                onValueChange={(value) => {
                  if (!isAfterSendChoice(value)) return;
                  setPicked(value);
                  saveAfterSendChoice(value);
                }}
                size="sm"
                className="h-9 w-44 rounded-md border-line-strong bg-surface text-small font-semibold text-ink pointer-coarse:h-11"
              />
            </>
          )}
          <AppSubmitButton isPending={isSending} pendingLabel="Sending..." variant="action" size="sm" className="w-auto">
            <T>Send reply</T>
          </AppSubmitButton>
        </div>
      </AppForm>
      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy ? <>{translate(confirmCopy.description, { name: requesterName })}</> : ""}
        confirmLabel={confirmCopy?.confirmLabel}
        onConfirm={() => {
          // The reply shows in the thread at once, so the dialog needn't wait.
          if (confirming) send(confirming);
          setConfirming(null);
        }}
      />
    </>
  );
};

export default TicketReplyForm;
