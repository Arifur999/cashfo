"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import CreateButton from "@/components/shared/CreateButton";
import { plansQuery } from "@/queries/plan.queries";
import FeatureFlagForm from "./FeatureFlagForm";

// Self-contained (owns its trigger), so the layout can put it in the header.
const CreateFeatureFlagButton = () => {
  const [open, setOpen] = useState(false);
  const plans = useQuery(plansQuery()).data?.data;
  const planOptions = useMemo(() => (plans ?? []).map((plan) => ({ value: plan.id, label: plan.name })), [plans]);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="New feature flag"
      description="Ship code dark, then switch it on here."
      trigger={
        <CreateButton>New flag</CreateButton>
      }
    >
      <FeatureFlagForm planOptions={planOptions} onDone={() => setOpen(false)} />
    </FormDialog>
  );
};

export default CreateFeatureFlagButton;
