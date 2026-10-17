"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import PlanDrawer from "./PlanDrawer";

// Self-contained (owns its trigger), so the page can drop it into the header.
const CreatePlanButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <PlanDrawer
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button size="lg" className="font-semibold shadow-button">
          New plan
        </Button>
      }
    />
  );
};

export default CreatePlanButton;
