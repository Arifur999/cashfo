"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import { Button } from "@/components/ui/button";
import TranslationForm from "./TranslationForm";
import T from "@/components/shared/T";

const CreateTranslationDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="New string"
      description="A text the apps show, matched by its English wording, and the Bangla to show for it."
      trigger={
        <Button size="sm" className="h-8">
          <Plus aria-hidden="true" /> <T>New string</T>
        </Button>
      }
    >
      <TranslationForm onDone={() => setOpen(false)} />
    </FormDialog>
  );
};

export default CreateTranslationDialog;
