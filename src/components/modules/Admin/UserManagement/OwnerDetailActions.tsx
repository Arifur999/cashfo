"use client";

import { ArrowLeftRight, Eye, MoreHorizontal, ShieldOff, Trash2, UserCheck } from "lucide-react";
import { useState } from "react";
import ResetOwnerDataDialog from "@/components/modules/Admin/ManageOwners/ResetOwnerDataDialog";
import T from "@/components/shared/T";
import Button from "@/components/smartly/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IOwnerDetail, IOwnerRef, OwnerDialog } from "@/types/owner.types";
import type { PlanChoice } from "./ChangeOwnerPlanForm";
import OwnerDialogs from "./OwnerDialogs";
import ResetOwnerPasswordButton from "./ResetOwnerPasswordButton";
import ViewAsCustomerDialog from "./ViewAsCustomerDialog";

interface OwnerDetailActionsProps {
  // The dialogs' fields, plus what Reset data names and checks.
  owner: IOwnerRef & Pick<IOwnerDetail, "email" | "businessId" | "workspaceCount">;
  plans: PlanChoice[];
  // What this admin's role may do (MANAGE_ROLES ownerStatus / ownerPlan).
  canChangeStatus: boolean;
  canChangePlan: boolean;
  // MANAGE_ROLES ownerView: a read-only look at the customer app as them.
  canViewAsCustomer: boolean;
  // MANAGE_ROLES ownerData: wiping their personal workspace back to a fresh
  // start, as Owners' row button does.
  canResetData: boolean;
}

// The control scale's 40px buttons, 44px under a finger; Suspend outlined in
// the red every secondary danger button uses.
const BUTTON = "pointer-coarse:h-11";
const DANGER = "border-expense-line text-expense hover:bg-expense-soft";

// The detail page's header, as the board lays it out: Change plan, Reset
// password, Suspend (or Activate), then the rest behind "...". The dialogs
// are the same ones the users table opens from its row menu, and Reset
// data the one Owners opens.
const OwnerDetailActions = ({ owner, plans, canChangeStatus, canChangePlan, canViewAsCustomer, canResetData }: OwnerDetailActionsProps) => {
  const { translate } = useLocale();
  const [activeDialog, setActiveDialog] = useState<OwnerDialog | null>(null);
  const [viewing, setViewing] = useState(false);
  const [resetting, setResetting] = useState(false);
  // A deleted account can't be used: no new plan, password or status.
  const deleted = owner.status === "DELETED";
  const canView = canViewAsCustomer && owner.status === "ACTIVE";
  // Only an account with a workspace has data to reset.
  const canReset = canResetData && owner.businessId !== null;

  return (
    <div className="flex flex-wrap gap-2">
      {canChangePlan && !deleted && (
        <Button variant="secondary" className={BUTTON} onClick={() => setActiveDialog("changePlan")}>
          <ArrowLeftRight className="size-3.75 text-ink-2" aria-hidden="true" /> <T>Change plan</T>
        </Button>
      )}
      {/* The roles that suspend a customer can also let one back in. */}
      {canChangeStatus && !deleted && <ResetOwnerPasswordButton owner={owner} className={BUTTON} />}
      {canChangeStatus && owner.status === "SUSPENDED" && (
        <Button variant="secondary" className={BUTTON} onClick={() => setActiveDialog("activate")}>
          <UserCheck className="size-3.75 text-ink-2" aria-hidden="true" /> <T>Activate</T>
        </Button>
      )}
      {canChangeStatus && owner.status === "ACTIVE" && (
        <Button variant="secondary" className={`${BUTTON} ${DANGER}`} onClick={() => setActiveDialog("suspend")}>
          {/* The verb, so it never reads like the Suspended badge beside the name. */}
          <ShieldOff className="size-3.75" aria-hidden="true" /> <T>Suspend@@action</T>
        </Button>
      )}
      {(canView || canReset) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="pointer-coarse:size-11" aria-label={translate("More for {name}", { name: owner.name })}>
              <MoreHorizontal className="size-4 text-ink-2" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {canView && (
              <DropdownMenuItem onClick={() => setViewing(true)}>
                <Eye aria-hidden="true" /> <T>View as customer</T>
              </DropdownMenuItem>
            )}
            {canView && canReset && <DropdownMenuSeparator />}
            {canReset && (
              <DropdownMenuItem variant="destructive" onClick={() => setResetting(true)}>
                <Trash2 aria-hidden="true" /> <T>Reset data</T>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <OwnerDialogs owner={owner} activeDialog={activeDialog} onClose={() => setActiveDialog(null)} plans={plans} />
      <ViewAsCustomerDialog owner={owner} open={viewing} onOpenChange={setViewing} />
      {canReset && <ResetOwnerDataDialog owner={owner} open={resetting} onOpenChange={setResetting} />}
    </div>
  );
};

export default OwnerDetailActions;
