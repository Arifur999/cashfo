"use client";

import { useState } from "react";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import { Button } from "@/components/ui/button";
import type { IAnnouncementFormValues } from "@/zod/announcement.validation";
import { getNewAnnouncementDefaults } from "./announcementForm.defaults";
import AnnouncementForm from "./AnnouncementForm";

// Self-contained (owns its trigger), so the layout can drop it into the header.
const CreateAnnouncementButton = () => {
  // Built when the drawer opens (an event), so the start time is "now" at
  // that moment and render stays pure.
  const [defaults, setDefaults] = useState<IAnnouncementFormValues | null>(null);

  return (
    <FormDrawer
      open={defaults !== null}
      onOpenChange={(open) => setDefaults(open ? getNewAnnouncementDefaults(new Date()) : null)}
      title="New announcement"
      width="lg"
      trigger={
        <Button size="lg" className="font-semibold shadow-button">
          New announcement
        </Button>
      }
    >
      {defaults && <AnnouncementForm defaultValues={defaults} onDone={() => setDefaults(null)} />}
    </FormDrawer>
  );
};

export default CreateAnnouncementButton;
