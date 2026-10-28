"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useState, useSyncExternalStore, useTransition } from "react";
import { replyToTicketAction } from "@/app/(dashboardLayout)/admin/support/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import AppForm from "@/components/shared/form/AppForm";
import AppSubmitButton from "@/components/shared/form/AppSubmitButton";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import SelectControl from "@/components/shared/form/SelectControl";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { asStatus } from "@/lib/i18n/message";
import { queryKeys } from "@/lib/queryKeys";
import { TICKET_STATUS_LABEL } from "@/lib/tickets";
import { ticketRequesterQuery } from "@/queries/ticket.queries";
import { type ISupportTicketDetail, type ITicketReplyPayload, TICKET_STATUSES, type TicketStatus } from "@/types/ticket.types";
import { type ITicketReplyFormValues, ticketReplyFormZodSchema } from "@/zod/ticket.validation";
import { type AfterSendChoice, DEFAULT_AFTER_SEND, initialAfterSend, isAfterSendChoice, KEEP_STATUS, readAfterSendChoice, saveAfterSendChoice, statusToSet, subscribeAfterSendChoice } from "./afterSendChoice";
import AttachLinkButton from "./AttachLinkButton";
import SavedReplyPicker from "./SavedReplyPicker";
import type { ThreadMessage } from "./TicketMessageBubble";
import { SEND_AND_CLOSE_STATUSES } from "./ticketStatusCopy";

const AFTER_SEND_OPTIONS = [{ value: KEEP_STATUS, label: "Leave as is" }, ...TICKET_STATUSES.map((status) => ({ value: status, label: asStatus(TICKET_STATUS_LABEL[status]) }))];

type Mode = "reply" | "note";

const closingCopy = (choice: AfterSendChoice, current: TicketStatus) => {
  const next = statusToSet(choice, current);
  return next ? SEND_AND_CLOSE_STATUSES[next] : undefined;
};

interface TicketReplyFormProps {
  ticket: ISupportTicketDetail;
  // Who the reply goes to, for the tab and the placeholder.
  requesterName: string;
  currentAdminId: string | null;
  // Puts the reply or note on the page while it's being sent.
  onSending: (message: ThreadMessage) => void;
}

// The box under the thread, as the board draws it: "Reply to Sharmin" or a
// "Note for admins" (kept on the ticket, never shown to the customer), the
// text, a saved reply or a link to drop in, and for a reply what to set the
// ticket to once it has gone: Waiting on user to start with, then whatever
// this admin last picked, but "Leave as is" on a solved or closed ticket.
// The status travels with the reply, in one request. Resolving or closing
// asks first, saying the reply goes too.
const TicketReplyForm = ({ ticket, requesterName, currentAdminId, onSending }: TicketReplyFormProps) => {
  const currentStatus = ticket.status;
  const [isSending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("reply");
  const [link, setLink] = useState<string | null>(null);
  // The server can't read this browser's choice, so the first render (and
  // hydration) shows the default and the remembered one follows.
  const remembered = useSyncExternalStore(subscribeAfterSendChoice, readAfterSendChoice, () => DEFAULT_AFTER_SEND);
  // A pick for this reply only (Resolved, Closed), until it is sent.
  const [picked, setPicked] = useState<AfterSendChoice | null>(null);
  const afterSend = picked ?? initialAfterSend(remembered, currentStatus);
  // The reply waiting on "Mark as resolved?" / "Close this ticket?".
  const [confirming, setConfirming] = useState<ITicketReplyFormValues | null>(null);
  const { translate } = useLocale();
  // The language the person reads, so a saved reply goes in Bangla to a
  // Bangla reader (the card beside the thread loads the same record).
  const customerId = ticket.requester?.isCustomer ? ticket.requester.id : null;
  const language = useQuery({ ...ticketRequesterQuery(customerId ?? ""), enabled: customerId !== null }).data?.data.preferredLanguage;
  const note = mode === "note";

  const reply = useActionMutation({
    action: (payload: ITicketReplyPayload) => replyToTicketAction(ticket.id, payload),
    successMessage: (sent) => (sent.isInternal ? "Note saved" : "Reply sent"),
    invalidateKeys: [queryKeys.tickets.all],
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: { message: "" } satisfies ITicketReplyFormValues,
    onSubmit: ({ value }) => {
      if (!note && closingCopy(afterSend, currentStatus)) {
        setConfirming(value);
        return;
      }
      send(value);
    },
  });

  function send(value: ITicketReplyFormValues) {
    const status = note ? null : statusToSet(afterSend, currentStatus);
    const attachmentUrl = link ?? undefined;
    const payload: ITicketReplyPayload = { message: value.message.trim(), ...(note && { isInternal: true }), ...(status && { status }), ...(attachmentUrl && { attachmentUrl }) };
    startTransition(async () => {
      onSending({
        id: `pending-${Date.now()}`,
        ticketId: ticket.id,
        senderType: "ADMIN",
        senderId: currentAdminId ?? "",
        message: payload.message,
        attachmentUrl: attachmentUrl ?? null,
        isInternal: note,
        createdAt: new Date().toISOString(),
        isPending: true,
      });
      form.reset();
      setLink(null);
      // Put the text back, so a failed send isn't lost.
      if (!(await reply.run(payload))) {
        form.setFieldValue("message", value.message);
        setLink(attachmentUrl ?? null);
        return;
      }
      setPicked(null);
    });
  }

  // A saved reply goes into the box: alone when it is empty, else after
  // what is there.
  const insert = (text: string) => {
    const current = form.getFieldValue("message").trimEnd();
    form.setFieldValue("message", current ? `${current}\n\n${text}` : text);
  };

  const confirmCopy = closingCopy(afterSend, currentStatus);

  return (
    <>
      <AppForm onSubmit={form.handleSubmit} className="flex flex-col gap-2.5 space-y-0 border-t border-line px-5 pt-3.5 pb-4.5">
        <SegmentedControl
          label="Reply or note"
          variant="pill"
          className="self-start rounded-[9px]"
          options={[
            { value: "reply" as const, label: <>{translate("Reply to {name}", { name: requesterName })}</> },
            { value: "note" as const, label: "Note for admins" },
          ]}
          value={mode}
          onChange={setMode}
        />
        <form.Field name="message" validators={{ onChange: ticketReplyFormZodSchema.shape.message }}>
          {(field) => (
            <AppTextareaField
              field={field}
              label={<span className="sr-only">{translate(note ? "Note for admins" : "Reply")}</span>}
              rows={3}
              placeholder={note ? "Only admins see this. The user gets no message." : translate("Write a reply to {name}", { name: requesterName })}
              className="leading-[1.55]"
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !isSending) {
                  event.preventDefault();
                  void form.handleSubmit();
                }
              }}
            />
          )}
        </form.Field>
        <div className="flex flex-wrap items-center gap-2">
          <SavedReplyPicker language={language?.toLowerCase() === "bn" ? "bn" : "en"} onPick={insert} />
          <AttachLinkButton value={link} onChange={setLink} />
          <span className="flex-1" />
          {!note && (
            <>
              <span className="text-[12.5px] leading-[normal] text-ink-muted">{translate("After sending, set to")}</span>
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
                className="h-9 w-auto min-w-36 gap-2 border-input px-3.5 text-small font-semibold text-ink pointer-coarse:h-11"
              />
            </>
          )}
          <AppSubmitButton isPending={isSending} pendingLabel={note ? "Saving..." : "Sending..."} variant="action" size="sm" className="w-auto text-[13.5px]">
            {translate(note ? "Add note" : "Send reply")}
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
