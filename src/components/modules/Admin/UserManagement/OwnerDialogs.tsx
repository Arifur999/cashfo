"use client";

import { useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import type { IOwnerRef, OwnerDialog } from "@/types/owner.types";
import ActivateOwnerDialog from "./ActivateOwnerDialog";
import ChangeOwnerPlanForm, { type PlanChoice } from "./ChangeOwnerPlanForm";
import SuspendOwnerDialog from "./SuspendOwnerDialog";

interface OwnerDialogsProps {
  owner: IOwnerRef | null;
  activeDialog: OwnerDialog | null;
  onClose: () => void;
  plans: PlanChoice[];
}

// Every owner action dialog in one place, shared by the users table (row
// actions) and the user detail page (header buttons).
const OwnerDialogs = ({ owner, activeDialog, onClose, plans }: OwnerDialogsProps) => {
  // The table clears its row the moment a dialog closes; the last person
  // stays on screen while the dialog fades out, so its words don't change
  // (or the form vanish) mid-fade.
  const [last, setLast] = useState(owner);
  if (owner && owner !== last) setLast(owner);
  const shown = owner ?? last;

  if (!shown) return null;

  const dialogProps = (dialog: OwnerDialog) => ({
    open: activeDialog === dialog,
    onOpenChange: (open: boolean) => {
      if (!open) onClose();
    },
  });

  return (
    <>
      <SuspendOwnerDialog owner={shown} {...dialogProps("suspend")} />
      <ActivateOwnerDialog owner={shown} {...dialogProps("activate")} />
      {/* The name as a node: it is data, never a dictionary key. */}
      <FormDialog title="Change plan" description={<>{shown.name}</>} size="sm" {...dialogProps("changePlan")}>
        <ChangeOwnerPlanForm owner={shown} plans={plans} onDone={onClose} />
      </FormDialog>
    </>
  );
};

export default OwnerDialogs;
