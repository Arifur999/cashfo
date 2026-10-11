"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import { Button } from "@/components/ui/button";
import CreateTicketForm from "./CreateTicketForm";

const CreateTicketDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="New ticket"
      description="Log an issue on a user's behalf -- from a call or an email, say."
      trigger={
        <Button>
          <Plus aria-hidden="true" /> New ticket
        </Button>
      }
    >
      <CreateTicketForm onDone={() => setOpen(false)} />
    </FormDialog>
  );
};

export default CreateTicketDialog;
