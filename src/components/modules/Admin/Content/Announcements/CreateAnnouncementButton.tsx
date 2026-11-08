"use client";

import { useState } from "react";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import CreateButton from "@/components/shared/CreateButton";
import type { IAnnouncementFormValues } from "@/zod/announcement.validation";
import { getNewAnnouncementDefaults } from "./announcementForm.defaults";
import AnnouncementForm from "./AnnouncementForm";

// Self-contained (owns its trigger), so the layout can drop it into the header.
// `trigger` lets the empty list offer it too.
const CreateAnnouncementButton = ({ trigger }: { trigger?: React.ReactNode }) => {
  // Built when the drawer opens (an event), so the start time is "now" at
  // that moment and render stays pure.
  const [defaults, setDefaults] = useState<IAnnouncementFormValues | null>(null);

  return (
    <FormDrawer
      open={defaults !== null}
      onOpenChange={(open) => setDefaults(open ? getNewAnnouncementDefaults(new Date()) : null)}
      title="New announcement"
      description="It goes to the bell in every user's app."
      centered
      width="3xl"
      trigger={trigger ?? <CreateButton>New announcement</CreateButton>}
    >
      {defaults && <AnnouncementForm defaultValues={defaults} onDone={() => setDefaults(null)} />}
    </FormDrawer>
  );
};

export default CreateAnnouncementButton;
