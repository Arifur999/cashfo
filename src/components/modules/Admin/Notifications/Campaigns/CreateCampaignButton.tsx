"use client";

import { useState } from "react";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import { Button } from "@/components/ui/button";
import CampaignForm from "./CampaignForm";
import T from "@/components/shared/T";

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
        <Button size="lg" className="font-semibold shadow-button">
          <T>New campaign</T>
        </Button>
      }
    >
      <CampaignForm onDone={() => setOpen(false)} />
    </FormDrawer>
  );
};

export default CreateCampaignButton;
