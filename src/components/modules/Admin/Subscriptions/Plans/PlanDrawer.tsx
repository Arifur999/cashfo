"use client";

import FormDrawer from "@/components/shared/dialog/FormDrawer";
import { formatNumber } from "@/lib/number";
import type { ISubscriptionPlan } from "@/types/plan.types";
import PlanForm from "./PlanForm";

interface PlanDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Omit to create a plan.
  plan?: ISubscriptionPlan | null;
  people?: number;
  trigger?: React.ReactNode;
}

// "Edit Monthly Pro" (132 people are on this plan) or "New plan", in the
// design's right-hand drawer.
const PlanDrawer = ({ open, onOpenChange, plan, people = 0, trigger }: PlanDrawerProps) => {
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={plan ? `Edit ${plan.name}` : "New plan"}
      description={plan ? `${formatNumber(people)} ${people === 1 ? "person is" : "people are"} on this plan` : "Pricing, trial and what the plan allows."}
      trigger={trigger}
    >
      <PlanForm plan={plan ?? undefined} people={people} onDone={() => onOpenChange(false)} />
    </FormDrawer>
  );
};

export default PlanDrawer;
