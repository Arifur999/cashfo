"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import FormDialog from "@/components/shared/dialog/FormDialog";
import DataTable from "@/components/shared/table/DataTable";
import T from "@/components/shared/T";
import ErrorState from "@/components/smartly/ErrorState";
import SegmentedControl from "@/components/smartly/SegmentedControl";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plansQuery } from "@/queries/plan.queries";
import { adminAccountsQuery } from "@/queries/security.queries";
import { featureFlagsQuery } from "@/queries/system.queries";
import type { IFeatureFlag } from "@/types/featureFlag.types";
import FeatureFlagRolloutForm from "./FeatureFlagRolloutForm";
import { buildFeatureFlagsColumns } from "./featureFlagsColumns";
import { type FlagSwitchView, readFlagSwitchView, showsFeatureFlag, withFlagSwitchView } from "./featureFlagsView";

// Every flag on one card, filtered All / On / Off in place (kept in the
// address bar as ?show=). Rollout opens who gets one flag; "New flag" lives
// in the page header.
const FeatureFlagsBoard = () => {
  const { translate, locale } = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = readFlagSwitchView(searchParams);
  const query = useQuery(featureFlagsQuery());
  const { data, isLoading, isFetching } = query;
  const plans = useQuery(plansQuery()).data?.data;
  const admins = useQuery(adminAccountsQuery()).data?.data;
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
  const shown = useMemo(() => flags.filter((item) => showsFeatureFlag(item, view)), [flags, view]);
  const count = (value: number) => formatCount(value, locale);

  // Replaced in place: Back leaves the page rather than undoing the choice.
  const setView = (next: FlagSwitchView) => {
    const rest = withFlagSwitchView(searchParams, next).toString();
    window.history.replaceState(null, "", rest ? `${pathname}?${rest}` : pathname);
  };

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl<FlagSwitchView>
          label="Show"
          variant="pill"
          className="bg-page"
          value={view}
          onChange={setView}
          // Counts only once the flags are in: a failed read isn't "0".
          options={[
            { value: "all", label: data ? translate("All · {count}", { count: count(flags.length) }) : "All" },
            { value: "on", label: data ? translate("On · {count}", { count: count(onCount) }) : "On" },
            { value: "off", label: data ? translate("Off · {count}", { count: count(flags.length - onCount) }) : "Off" },
          ]}
        />
        <span className="flex-1" />
        <span className="text-small text-ink-muted">
          <T>Each person always gets the same answer for a flag, so a 25% rollout stays the same 25%.</T>
        </span>
      </div>
      {query.isError && !data ? (
        <ErrorState title={translate("Couldn't load the feature flags")} onRetry={() => void query.refetch()} className="shadow-card" />
      ) : (
        <DataTable
          data={data ? shown : undefined}
          columns={columns}
          // The density scale's relaxed row: a name over its description.
          layout={{ gap: 14, rowHeight: 66, headPadding: 10 }}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          isFetching={isFetching}
          hideToolbar
          initialPageSize={100}
          emptyMessage={view === "all" ? "No feature flags yet." : "No flags here."}
        />
      )}
      {/* Only who gets the flag can change here; its name and key can't. */}
      <FormDialog title="Edit rollout" description={flag?.name} size="sm" {...getDialogProps("edit")}>
        {flag && <FeatureFlagRolloutForm flag={flag} planOptions={planOptions} onDone={closeDialog} />}
      </FormDialog>
    </div>
  );
};

export default FeatureFlagsBoard;
