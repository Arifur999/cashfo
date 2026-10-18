"use client";

import { useState } from "react";
import CreateButton from "@/components/shared/CreateButton";
import FormDialog from "@/components/shared/dialog/FormDialog";
import TranslationForm from "./TranslationForm";

const CreateTranslationDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="New string"
      description="A text the apps show, matched by its English wording, and the Bangla to show for it."
      trigger={<CreateButton>New string</CreateButton>}
    >
      <TranslationForm onDone={() => setOpen(false)} />
    </FormDialog>
  );
};

export default CreateTranslationDialog;
