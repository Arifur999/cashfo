"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import { Button } from "@/components/ui/button";
import type { CategoryDirection } from "@/types/category.types";
import { NEW_CATEGORY_DEFAULTS } from "./categoryForm.defaults";
import CategoryForm from "./CategoryForm";
import T from "@/components/shared/T";

interface CreateCategoryDialogProps {
  // Which side the new category starts on (the panel's open tab).
  direction?: CategoryDirection;
  trigger?: React.ReactNode;
}

// Self-contained (owns its trigger); the panel passes its own small button.
const CreateCategoryDialog = ({ direction = "EXPENSE", trigger }: CreateCategoryDialogProps) => {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="New category"
      description="A starting income or expense category every new workspace gets."
      trigger={
        trigger ?? (
          <Button>
            <Plus aria-hidden="true" /> <T>New category</T>
          </Button>
        )
      }
    >
      <CategoryForm defaultValues={{ ...NEW_CATEGORY_DEFAULTS, type: direction }} onDone={() => setOpen(false)} />
    </FormDialog>
  );
};

export default CreateCategoryDialog;
