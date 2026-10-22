"use client";

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
  // The table keeps its row after a dialog closes (useRowDialogs), so the
  // words stay put while the dialog fades out.
  if (!owner) return null;

  const dialogProps = (dialog: OwnerDialog) => ({
    open: activeDialog === dialog,
    onOpenChange: (open: boolean) => {
      if (!open) onClose();
    },
  });

  return (
    <>
      <SuspendOwnerDialog owner={owner} {...dialogProps("suspend")} />
      <ActivateOwnerDialog owner={owner} {...dialogProps("activate")} />
      {/* The name as a node: it is data, never a dictionary key. */}
      <FormDialog title="Change plan" description={<>{owner.name}</>} size="sm" {...dialogProps("changePlan")}>
        <ChangeOwnerPlanForm owner={owner} plans={plans} onDone={onClose} />
      </FormDialog>
    </>
  );
};

export default OwnerDialogs;
