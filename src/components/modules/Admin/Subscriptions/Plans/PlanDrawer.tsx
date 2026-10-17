"use client";

import FormDrawer from "@/components/shared/dialog/FormDrawer";
import type { ISubscriptionPlan } from "@/types/plan.types";
import PlanForm from "./PlanForm";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";

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
  const { translate } = useLocale();
  return (
    <FormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={plan ? translate("Edit {name}", { name: plan.name }) : "New plan"}
      description={plan ? plural(translate, people, "{count} person is on this plan", "{count} people are on this plan") : "Pricing, trial and what the plan allows."}
      trigger={trigger}
    >
      <PlanForm plan={plan ?? undefined} people={people} onDone={() => onOpenChange(false)} />
    </FormDrawer>
  );
};

export default PlanDrawer;
