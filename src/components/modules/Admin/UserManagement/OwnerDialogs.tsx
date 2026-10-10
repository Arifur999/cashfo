"use client";

import FormDialog from "@/components/shared/dialog/FormDialog";
import type { IOwnerRef, OwnerDialog } from "@/types/owner.types";
import type { IPlanOption } from "@/types/plan.types";
import ActivateOwnerDialog from "./ActivateOwnerDialog";
import ChangeOwnerPlanForm from "./ChangeOwnerPlanForm";
import SuspendOwnerDialog from "./SuspendOwnerDialog";

interface OwnerDialogsProps {
  owner: IOwnerRef | null;
  activeDialog: OwnerDialog | null;
  onClose: () => void;
  plans: IPlanOption[];
}

// Every owner action dialog in one place, shared by the users table (row
// actions) and the user detail page (header buttons).
const OwnerDialogs = ({ owner, activeDialog, onClose, plans }: OwnerDialogsProps) => {
  const dialogProps = (dialog: OwnerDialog) => ({
    open: activeDialog === dialog && owner !== null,
    onOpenChange: (open: boolean) => {
      if (!open) onClose();
    },
  });

  return (
    <>
      <SuspendOwnerDialog owner={owner} {...dialogProps("suspend")} />
      <ActivateOwnerDialog owner={owner} {...dialogProps("activate")} />
      <FormDialog title="Change plan" description={owner?.name} size="sm" {...dialogProps("changePlan")}>
        {owner && <ChangeOwnerPlanForm owner={owner} plans={plans} onDone={onClose} />}
      </FormDialog>
    </>
  );
};

export default OwnerDialogs;
