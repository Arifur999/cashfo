"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import { Button } from "@/components/ui/button";
import { NEW_CATEGORY_DEFAULTS } from "./categoryForm.defaults";
import CategoryForm from "./CategoryForm";

const CreateCategoryDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="New category"
      description="A default income or expense category new workspaces start with."
      trigger={
        <Button>
          <Plus aria-hidden="true" /> New category
        </Button>
      }
    >
      <CategoryForm defaultValues={NEW_CATEGORY_DEFAULTS} onDone={() => setOpen(false)} />
    </FormDialog>
  );
};

export default CreateCategoryDialog;
