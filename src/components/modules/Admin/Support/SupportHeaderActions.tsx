"use client";

import { Settings2 } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import SavedRepliesDrawer from "./SavedReplies/SavedRepliesDrawer";
import CreateTicketDialog from "./Tickets/CreateTicketDialog";

// The Support header's buttons: the board's Saved replies, and (for those
// who handle tickets) a ticket logged on someone's behalf -- a call or an
// email -- which the board leaves out but the team still needs.
const SupportHeaderActions = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      {canManage && <CreateTicketDialog />}
      <Button variant="secondary" className="px-3.5" onClick={() => setOpen(true)}>
        <Settings2 className="text-ink-2" aria-hidden="true" />
        {translate("Saved replies")}
      </Button>
      <SavedRepliesDrawer open={open} onOpenChange={setOpen} canManage={canManage} />
    </>
  );
};

export default SupportHeaderActions;
