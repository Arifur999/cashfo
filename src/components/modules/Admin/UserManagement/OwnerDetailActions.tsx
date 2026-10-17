"use client";

import { ArrowLeftRight, Eye, ShieldOff, UserCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { IOwnerRef, OwnerDialog } from "@/types/owner.types";
import type { IPlanOption } from "@/types/plan.types";
import OwnerDialogs from "./OwnerDialogs";
import ViewAsCustomerDialog from "./ViewAsCustomerDialog";

interface OwnerDetailActionsProps {
  owner: IOwnerRef;
  plans: IPlanOption[];
  // What this admin's role may do (MANAGE_ROLES ownerStatus / ownerPlan).
  canChangeStatus: boolean;
  canChangePlan: boolean;
  // MANAGE_ROLES ownerView: a read-only look at the customer app as them.
  canViewAsCustomer: boolean;
}

// The detail page's header buttons; the dialogs are the same ones the users
// table opens from its row menu.
const OwnerDetailActions = ({ owner, plans, canChangeStatus, canChangePlan, canViewAsCustomer }: OwnerDetailActionsProps) => {
  const [activeDialog, setActiveDialog] = useState<OwnerDialog | null>(null);
  const [viewing, setViewing] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      {canViewAsCustomer && owner.status === "ACTIVE" && (
        <Button variant="outline" onClick={() => setViewing(true)}>
          <Eye aria-hidden="true" /> View as customer
        </Button>
      )}
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
        <Button variant="outline" className="border-expense/50 text-expense hover:bg-expense-soft hover:text-expense" onClick={() => setActiveDialog("suspend")}>
          <ShieldOff aria-hidden="true" /> Suspend
        </Button>
      )}
      <OwnerDialogs owner={owner} activeDialog={activeDialog} onClose={() => setActiveDialog(null)} plans={plans} />
      <ViewAsCustomerDialog owner={owner} open={viewing} onOpenChange={setViewing} />
    </div>
  );
};

export default OwnerDetailActions;
