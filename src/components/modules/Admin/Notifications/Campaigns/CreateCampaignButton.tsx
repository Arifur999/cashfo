"use client";

import { useState } from "react";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import CreateButton from "@/components/shared/CreateButton";
import CampaignForm from "./CampaignForm";

// Self-contained (owns its trigger), so the layout can drop it into the header.
const CreateCampaignButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <FormDrawer
      open={open}
      onOpenChange={setOpen}
      title="New campaign"
      width="lg"
      trigger={
        <CreateButton>New campaign</CreateButton>
      }
    >
      <CampaignForm onDone={() => setOpen(false)} />
    </FormDrawer>
  );
};

export default CreateCampaignButton;
