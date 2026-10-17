"use client";

import { useState } from "react";
import CreateButton from "@/components/shared/CreateButton";
import PlanDrawer from "./PlanDrawer";

// Self-contained (owns its trigger), so the page can drop it into the header.
const CreatePlanButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <PlanDrawer
      open={open}
      onOpenChange={setOpen}
      trigger={
        <CreateButton>New plan</CreateButton>
      }
    />
  );
};

export default CreatePlanButton;
