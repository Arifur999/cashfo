"use client";

import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import { Button } from "@/components/ui/button";
import CreateTicketForm from "./CreateTicketForm";

// In the page header, beside the title, as the design places its one
// header button.
const CreateTicketDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="New ticket"
      description="Log an issue on a user's behalf -- from a call or an email, say."
      trigger={
        <Button variant="outline" size="lg" className="border-line-strong bg-surface font-semibold text-ink hover:bg-cream">
          New ticket
        </Button>
      }
    >
      <CreateTicketForm onDone={() => setOpen(false)} />
    </FormDialog>
  );
};

export default CreateTicketDialog;
