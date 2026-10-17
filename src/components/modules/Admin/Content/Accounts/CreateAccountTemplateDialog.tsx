"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import { Button } from "@/components/ui/button";
import { getNewAccountTemplateDefaults } from "./accountTemplateForm.defaults";
import AccountTemplateForm from "./AccountTemplateForm";

// Self-contained (owns its trigger); the panel passes its own small button.
const CreateAccountTemplateDialog = ({ trigger }: { trigger?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="New account"
      description="A top-level default account. Add sub-accounts to it from its row."
      trigger={
        trigger ?? (
          <Button>
            <Plus aria-hidden="true" /> New account
          </Button>
        )
      }
    >
      <AccountTemplateForm defaultValues={getNewAccountTemplateDefaults()} onDone={() => setOpen(false)} />
    </FormDialog>
  );
};

export default CreateAccountTemplateDialog;
