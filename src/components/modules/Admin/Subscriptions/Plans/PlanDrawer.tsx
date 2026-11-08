"use client";

import FormDrawer from "@/components/shared/dialog/FormDrawer";
import { countPhrase } from "@/components/modules/Admin/Payments/paymentsDisplay";
import type { ISubscriptionPlan } from "@/types/plan.types";
import PlanForm from "./PlanForm";
import { useLocale } from "@/lib/i18n/LocaleProvider";

interface PlanDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Omit to create a plan. The board keeps it while the drawer closes.
  plan?: ISubscriptionPlan | null;
  // Who is on it now; undefined while that is unknown (no "0 people").
  people?: number;
  trigger?: React.ReactNode;
}

// "Edit Monthly Pro" (141 people are on this plan) or "New plan", in the
// v16 board's centred card.
const PlanDrawer = ({ open, onOpenChange, plan, people, trigger }: PlanDrawerProps) => {
  const { translate, locale } = useLocale();
  const description = plan
    ? people === undefined
      ? undefined
      : countPhrase(translate, locale, people, "{count} person is on this plan", "{count} people are on this plan")
    : "Pricing, trial and what the plan allows.";
  return (
    <FormDrawer centered open={open} onOpenChange={onOpenChange} title={plan ? translate("Edit {name}", { name: plan.name }) : "New plan"} description={description} trigger={trigger}>
      {/* Keyed by the plan, so another plan's open always starts from its own values. */}
      <PlanForm key={plan?.id ?? "new"} plan={plan ?? undefined} people={people} onDone={() => onOpenChange(false)} />
    </FormDrawer>
  );
};

export default PlanDrawer;
