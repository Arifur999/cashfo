"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { createTicketAction } from "@/app/(dashboardLayout)/admin/support/_action";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppField from "@/components/shared/form/AppField";
import AppForm from "@/components/shared/form/AppForm";
import AppSelectField from "@/components/shared/form/AppSelectField";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import { useActionMutation } from "@/hooks/useActionMutation";
import { queryKeys } from "@/lib/queryKeys";
import { createTicketFormZodSchema, type ICreateTicketFormValues } from "@/zod/ticket.validation";
import { TICKET_CATEGORY_OPTIONS, TICKET_PRIORITY_OPTIONS } from "../ticketOptions";
import UserSearchField from "./UserSearchField";

const DEFAULT_VALUES: ICreateTicketFormValues = {
  userId: "",
  subject: "",
  category: "TECHNICAL",
  priority: "MEDIUM",
  initialMessage: "",
};

const { shape } = createTicketFormZodSchema;

// Mounted inside the dialog content, so each open starts empty.
const CreateTicketForm = ({ onDone }: { onDone: () => void }) => {
  const router = useRouter();
  const { run, isPending } = useActionMutation({
    action: createTicketAction,
    successMessage: "Ticket created",
    invalidateKeys: [queryKeys.tickets.all],
    // Straight to the new ticket, where the admin carries on with it.
    onSuccess: (ticket) => router.push(`/admin/support/${ticket.id}`),
    refreshRoute: false,
  });

  const form = useForm({
    defaultValues: DEFAULT_VALUES,
    onSubmit: async ({ value }) => {
      if (await run(value)) {
        onDone();
      }
    },
  });

  return (
    <AppForm onSubmit={form.handleSubmit}>
      <form.Field name="userId" validators={{ onChange: shape.userId }}>
        {(field) => <UserSearchField field={field} label="User" description="The user this ticket is for." />}
      </form.Field>
      <form.Field name="subject" validators={{ onChange: shape.subject }}>
        {(field) => <AppField field={field} label="Subject" placeholder="Short summary of the issue" />}
      </form.Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="category" validators={{ onChange: shape.category }}>
          {(field) => <AppSelectField field={field} label="Category" options={TICKET_CATEGORY_OPTIONS} />}
        </form.Field>
        <form.Field name="priority" validators={{ onChange: shape.priority }}>
          {(field) => <AppSelectField field={field} label="Priority" options={TICKET_PRIORITY_OPTIONS} />}
        </form.Field>
      </div>
      <form.Field name="initialMessage" validators={{ onChange: shape.initialMessage }}>
        {(field) => (
          <AppTextareaField
            field={field}
            label="Message"
            rows={5}
            placeholder="Describe the user's issue..."
            description="Logged as the user's own first message."
          />
        )}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Create ticket" pendingLabel="Creating..." />
    </AppForm>
  );
};

export default CreateTicketForm;
