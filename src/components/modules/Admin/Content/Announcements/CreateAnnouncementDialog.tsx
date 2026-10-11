"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import { Button } from "@/components/ui/button";
import type { IAnnouncementFormValues } from "@/zod/announcement.validation";
import { getNewAnnouncementDefaults } from "./announcementForm.defaults";
import AnnouncementForm from "./AnnouncementForm";

const CreateAnnouncementDialog = () => {
  // Built when the dialog opens (an event), so the start time is "now" at
  // that moment and render stays pure.
  const [defaults, setDefaults] = useState<IAnnouncementFormValues | null>(null);

  return (
    <FormDialog
      open={defaults !== null}
      onOpenChange={(open) => setDefaults(open ? getNewAnnouncementDefaults(new Date()) : null)}
      title="New announcement"
      description="A banner in the end-user app, for everyone or one plan's subscribers."
      size="lg"
      trigger={
        <Button>
          <Plus aria-hidden="true" /> New announcement
        </Button>
      }
    >
      {defaults && <AnnouncementForm defaultValues={defaults} onDone={() => setDefaults(null)} />}
    </FormDialog>
  );
};

export default CreateAnnouncementDialog;
