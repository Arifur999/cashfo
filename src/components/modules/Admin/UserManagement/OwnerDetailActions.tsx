"use client";

import { ArrowLeftRight, ShieldOff, UserCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { IOwnerRef, OwnerDialog } from "@/types/owner.types";
import type { IPlanOption } from "@/types/plan.types";
import OwnerDialogs from "./OwnerDialogs";

interface OwnerDetailActionsProps {
  owner: IOwnerRef;
  plans: IPlanOption[];
  // What this admin's role may do (MANAGE_ROLES ownerStatus / ownerPlan).
  canChangeStatus: boolean;
  canChangePlan: boolean;
}

// The detail page's header buttons; the dialogs are the same ones the users
// table opens from its row menu.
const OwnerDetailActions = ({ owner, plans, canChangeStatus, canChangePlan }: OwnerDetailActionsProps) => {
  const [activeDialog, setActiveDialog] = useState<OwnerDialog | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      {canChangePlan && (
        <Button variant="outline" onClick={() => setActiveDialog("changePlan")}>
          <ArrowLeftRight aria-hidden="true" /> Change plan
        </Button>
      )}
      {canChangeStatus && owner.status === "SUSPENDED" && (
        <Button variant="outline" onClick={() => setActiveDialog("activate")}>
          <UserCheck aria-hidden="true" /> Activate
        </Button>
      )}
      {canChangeStatus && owner.status === "ACTIVE" && (
        <Button variant="destructive" onClick={() => setActiveDialog("suspend")}>
          <ShieldOff aria-hidden="true" /> Suspend
        </Button>
      )}
      <OwnerDialogs owner={owner} activeDialog={activeDialog} onClose={() => setActiveDialog(null)} plans={plans} />
    </div>
  );
};

export default OwnerDetailActions;
