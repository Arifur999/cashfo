"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import type { DataTableActions, DataTableFilterConfig } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { Button } from "@/components/ui/button";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { plansQuery } from "@/queries/plan.queries";
import { featureFlagsQuery } from "@/queries/system.queries";
import type { IFeatureFlag } from "@/types/featureFlag.types";
import FeatureFlagForm from "./FeatureFlagForm";
import FeatureFlagRolloutForm from "./FeatureFlagRolloutForm";
import { buildFeatureFlagsColumns } from "./featureFlagsColumns";

const FLAG_FILTERS: DataTableFilterConfig[] = [
  {
    id: "isEnabled",
    type: "single-select",
    label: "Enabled",
    options: [
      { value: "On", label: "On" },
      { value: "Off", label: "Off" },
    ],
  },
];

const FeatureFlagsTable = () => {
  const { data, isLoading, isFetching } = useQuery(featureFlagsQuery());
  const { data: plansResponse } = useQuery(plansQuery());
  const plans = useMemo(() => plansResponse?.data ?? [], [plansResponse]);
  const planOptions = useMemo(() => plans.map((plan) => ({ value: plan.id, label: plan.name })), [plans]);
  const columns = useMemo(() => buildFeatureFlagsColumns(new Map(plans.map((plan) => [plan.id, plan.name]))), [plans]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { activeRow: flag, openDialog, closeDialog, getDialogProps } = useRowDialogs<IFeatureFlag, "rollout">();

  const actions = useMemo<DataTableActions<IFeatureFlag>>(
    () => ({ extra: [{ label: "Rollout & targeting", icon: SlidersHorizontal, onClick: (row) => openDialog("rollout", row) }] }),
    [openDialog],
  );

  return (
    <>
      <DataTable
        data={data?.data}
        columns={columns}
        getRowId={(row) => row.id}
        tableId="feature-flags"
        isLoading={isLoading}
        isFetching={isFetching}
        search={{ placeholder: "Search flags..." }}
        filters={{ configs: FLAG_FILTERS }}
        exportFileName="feature-flags"
        actions={actions}
        toolbarAction={
          <Button size="sm" className="h-8" onClick={() => setIsCreateOpen(true)}>
            <Plus aria-hidden="true" /> New flag
          </Button>
        }
        emptyMessage="No feature flags yet."
      />
      <FormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} title="New feature flag" description="Ship code dark, then switch it on here.">
        <FeatureFlagForm planOptions={planOptions} onDone={() => setIsCreateOpen(false)} />
      </FormDialog>
      <FormDialog title="Rollout & targeting" description={flag?.name} size="sm" {...getDialogProps("rollout")}>
        {flag && <FeatureFlagRolloutForm flag={flag} planOptions={planOptions} onDone={closeDialog} />}
      </FormDialog>
    </>
  );
};

export default FeatureFlagsTable;
