"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import DataTable from "@/components/shared/table/DataTable";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { formatNumber } from "@/lib/number";
import { plansQuery } from "@/queries/plan.queries";
import { adminAccountsQuery } from "@/queries/security.queries";
import { featureFlagsQuery } from "@/queries/system.queries";
import type { IFeatureFlag } from "@/types/featureFlag.types";
import FeatureFlagRolloutForm from "./FeatureFlagRolloutForm";
import { buildFeatureFlagsColumns } from "./featureFlagsColumns";
import T from "@/components/shared/T";

type View = "all" | "on" | "off";

// Every flag on one card, filtered All / On / Off in place. Edit opens the
// rollout and plans of one flag; "New flag" lives in the page header.
const FeatureFlagsBoard = () => {
  const { translate } = useLocale();
  const { data, isLoading, isFetching } = useQuery(featureFlagsQuery());
  const plans = useQuery(plansQuery()).data?.data;
  const admins = useQuery(adminAccountsQuery()).data?.data;
  const [view, setView] = useState<View>("all");
  const { activeRow: flag, openDialog, closeDialog, getDialogProps } = useRowDialogs<IFeatureFlag, "edit">();

  const planOptions = useMemo(() => (plans ?? []).map((plan) => ({ value: plan.id, label: plan.name })), [plans]);
  const columns = useMemo(
    () =>
      buildFeatureFlagsColumns({
        planNames: new Map((plans ?? []).map((plan) => [plan.id, plan.name])),
        adminNames: new Map((admins ?? []).map((admin) => [admin.id, admin.name])),
        onEdit: (row) => openDialog("edit", row),
      }),
    [plans, admins, openDialog],
  );

  const flags = useMemo(() => data?.data ?? [], [data]);
  const onCount = flags.filter((item) => item.isEnabled).length;
  const shown = useMemo(() => (view === "all" ? flags : flags.filter((item) => item.isEnabled === (view === "on"))), [flags, view]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl<View>
          label="Show"
          value={view}
          onChange={setView}
          options={[
            { value: "all", label: translate("All · {count}", { count: formatNumber(flags.length) }) },
            { value: "on", label: translate("On · {count}", { count: formatNumber(onCount) }) },
            { value: "off", label: translate("Off · {count}", { count: formatNumber(flags.length - onCount) }) },
          ]}
        />
        <span className="flex-1" />
        <span className="text-small text-ink-muted"><T>Each person always gets the same answer for a flag, so a 25% rollout stays the same 25%.</T></span>
      </div>
      <DataTable
        data={data ? shown : undefined}
        columns={columns}
        layout={{ gap: 16, rowHeight: 66, headPadding: 12 }}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        hideToolbar
        initialPageSize={100}
        emptyMessage={view === "all" ? "No feature flags yet." : "No flags here."}
      />
      <FormDialog title="Edit flag" description={flag?.name} size="sm" {...getDialogProps("edit")}>
        {flag && <FeatureFlagRolloutForm flag={flag} planOptions={planOptions} onDone={closeDialog} />}
      </FormDialog>
    </div>
  );
};

export default FeatureFlagsBoard;
