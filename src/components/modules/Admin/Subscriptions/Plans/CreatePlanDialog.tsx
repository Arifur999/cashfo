"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import { Button } from "@/components/ui/button";
import PlanForm from "./PlanForm";

// Self-contained (owns its trigger), so the page can drop it into the header.
const CreatePlanDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Create plan"
      description="Pricing, trial and the feature limits subscribers get."
      size="lg"
      trigger={
        <Button>
          <Plus aria-hidden="true" /> Create plan
        </Button>
      }
    >
      <PlanForm onDone={() => setOpen(false)} />
    </FormDialog>
  );
};

export default CreatePlanDialog;
