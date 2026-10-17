"use client";

import { useQuery } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { useMemo } from "react";
import { cancelCampaignAction } from "@/app/(dashboardLayout)/admin/notifications/campaigns/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { queryKeys } from "@/lib/queryKeys";
import { campaignsQuery } from "@/queries/notification.queries";
import { plansQuery } from "@/queries/plan.queries";
import type { ICampaign } from "@/types/notification.types";
import { CAMPAIGN_FILTERS } from "./campaignOptions";
import { buildCampaignsColumns } from "./campaignsColumns";
import SendSummaryCard from "./SendSummaryCard";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const isOpen = (campaign: ICampaign) => campaign.status === "DRAFT" || campaign.status === "SCHEDULED";

// The campaigns, with the last day of sending beside them. Any admin can
// draft a campaign; cancelling is for the roles that may send.
const CampaignsTable = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const { data, isLoading, isFetching } = useQuery(campaignsQuery());
  const { data: plansResponse } = useQuery(plansQuery());
  const columns = useMemo(() => buildCampaignsColumns(new Map((plansResponse?.data ?? []).map((plan) => [plan.id, plan.name]))), [plansResponse]);
  const { activeRow: campaign, openDialog, closeDialog, getDialogProps } = useRowDialogs<ICampaign, "cancel">();

  const cancel = useActionMutation({
    action: cancelCampaignAction,
    successMessage: (cancelled) => translate("{title} cancelled", { title: cancelled.title }),
    invalidateKeys: [queryKeys.campaigns.all],
    refreshRoute: false,
  });

  const actions = useMemo<DataTableActions<ICampaign> | undefined>(
    () =>
      canManage
        ? {
            extra: [{ label: "Cancel campaign", icon: Ban, destructive: true, onClick: (row) => openDialog("cancel", row), hidden: (row) => !isOpen(row) }],
          }
        : undefined,
    [canManage, openDialog],
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <DataTable
        data={data?.data}
        columns={columns}
        getRowId={(row) => row.id}
        tableId="campaigns"
        isLoading={isLoading}
        isFetching={isFetching}
        search={{ placeholder: "Search campaigns", width: "sm" }}
        filters={{ configs: CAMPAIGN_FILTERS }}
        exportFileName="campaigns"
        actions={actions}
        emptyMessage="No campaigns yet."
      />
      <SendSummaryCard />
      <ConfirmDialog
        {...getDialogProps("cancel")}
        title={translate("Cancel {title}?", { title: campaign?.title ?? "" })}
        description="It won't be sent. This can't be undone, but you can make a new one."
        variant="destructive"
        confirmLabel="Cancel campaign"
        pendingLabel="Cancelling..."
        isPending={cancel.isPending}
        onConfirm={async () => {
          if (campaign && (await cancel.run(campaign.id))) closeDialog();
        }}
      />
    </div>
  );
};

export default CampaignsTable;
