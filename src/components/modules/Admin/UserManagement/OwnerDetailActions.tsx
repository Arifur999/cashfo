"use client";

import { ArrowLeftRight, Eye, MoreHorizontal, ShieldOff, UserCheck } from "lucide-react";
import { useState } from "react";
import Button from "@/components/smartly/Button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import type { IOwnerRef, OwnerDialog } from "@/types/owner.types";
import type { IPlanOption } from "@/types/plan.types";
import OwnerDialogs from "./OwnerDialogs";
import ResetOwnerPasswordButton from "./ResetOwnerPasswordButton";
import ViewAsCustomerDialog from "./ViewAsCustomerDialog";
import T from "@/components/shared/T";

interface OwnerDetailActionsProps {
  owner: IOwnerRef;
  plans: IPlanOption[];
  // What this admin's role may do (MANAGE_ROLES ownerStatus / ownerPlan).
  canChangeStatus: boolean;
  canChangePlan: boolean;
  // MANAGE_ROLES ownerView: a read-only look at the customer app as them.
  canViewAsCustomer: boolean;
}

// The design's 38px header buttons; Suspend in red.
const BUTTON = "h-9.5";
const DANGER = "border-chart-expense text-expense hover:bg-expense-soft";

// The detail page's header, as the board lays it out: Change plan, Reset
// password, Suspend (or Turn back on), then the rest behind "...". The
// dialogs are the same ones the users table opens from its row menu.
const OwnerDetailActions = ({ owner, plans, canChangeStatus, canChangePlan, canViewAsCustomer }: OwnerDetailActionsProps) => {
  const { translate } = useLocale();
  const [activeDialog, setActiveDialog] = useState<OwnerDialog | null>(null);
  const [viewing, setViewing] = useState(false);
  const canView = canViewAsCustomer && owner.status === "ACTIVE";

  return (
    <div className="flex flex-wrap gap-2">
      {canChangePlan && (
        <Button variant="secondary" className={BUTTON} onClick={() => setActiveDialog("changePlan")}>
          <ArrowLeftRight className="size-3.75 text-ink-2" aria-hidden="true" /> <T>Change plan</T>
        </Button>
      )}
      {/* The roles that suspend a customer can also let one back in. */}
      {canChangeStatus && owner.status !== "DELETED" && <ResetOwnerPasswordButton owner={owner} className={BUTTON} />}
      {canChangeStatus && owner.status === "SUSPENDED" && (
        <Button variant="secondary" className={BUTTON} onClick={() => setActiveDialog("activate")}>
          <UserCheck className="size-3.75 text-ink-2" aria-hidden="true" /> <T>Activate</T>
        </Button>
      )}
      {canChangeStatus && owner.status === "ACTIVE" && (
        <Button variant="secondary" className={`${BUTTON} ${DANGER}`} onClick={() => setActiveDialog("suspend")}>
          <ShieldOff className="size-3.75" aria-hidden="true" /> <T>Suspend</T>
        </Button>
      )}
      {canView && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon-sm" className="size-9.5" aria-label={translate("More for {name}", { name: owner.name })}>
              <MoreHorizontal className="size-4 text-ink-2" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setViewing(true)}>
              <Eye aria-hidden="true" /> <T>View as customer</T>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <OwnerDialogs owner={owner} activeDialog={activeDialog} onClose={() => setActiveDialog(null)} plans={plans} />
      <ViewAsCustomerDialog owner={owner} open={viewing} onOpenChange={setViewing} />
    </div>
  );
};

export default OwnerDetailActions;
