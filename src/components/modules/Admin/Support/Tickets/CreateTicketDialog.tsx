"use client";

import { useState } from "react";
import CreateButton from "@/components/shared/CreateButton";
import FormDialog from "@/components/shared/dialog/FormDialog";
import CreateTicketForm from "./CreateTicketForm";

// In the page header, beside Saved replies: white, as the board keeps
// its one filled button for the page's own work.
const CreateTicketDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="New ticket"
      description="Log an issue on a user's behalf -- from a call or an email, say."
      trigger={<CreateButton variant="secondary">New ticket</CreateButton>}
    >
      <CreateTicketForm onDone={() => setOpen(false)} />
    </FormDialog>
  );
};

export default CreateTicketDialog;
