"use client";

import { useQuery } from "@tanstack/react-query";
import { Ban, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { cancelCampaignAction } from "@/app/(dashboardLayout)/admin/notifications/campaigns/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import FormDialog from "@/components/shared/dialog/FormDialog";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { Button } from "@/components/ui/button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { queryKeys } from "@/lib/queryKeys";
import { campaignsQuery } from "@/queries/notification.queries";
import { plansQuery } from "@/queries/plan.queries";
import type { ICampaign } from "@/types/notification.types";
import CampaignForm from "./CampaignForm";
import { CAMPAIGN_FILTERS } from "./campaignOptions";
import { buildCampaignsColumns } from "./campaignsColumns";

const isOpen = (campaign: ICampaign) => campaign.status === "DRAFT" || campaign.status === "SCHEDULED";

// Any admin can draft a campaign; cancelling is for the roles that may send.
const CampaignsTable = ({ canManage }: { canManage: boolean }) => {
  const { data, isLoading, isFetching } = useQuery(campaignsQuery());
  const { data: plansResponse } = useQuery(plansQuery());
  const columns = useMemo(
    () => buildCampaignsColumns(new Map((plansResponse?.data ?? []).map((plan) => [plan.id, plan.name]))),
    [plansResponse],
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { activeRow: campaign, openDialog, closeDialog, getDialogProps } = useRowDialogs<ICampaign, "cancel">();

  const cancel = useActionMutation({
    action: cancelCampaignAction,
    successMessage: (cancelled) => `${cancelled.title} cancelled`,
    invalidateKeys: [queryKeys.campaigns.all],
    refreshRoute: false,
  });

  const actions = useMemo<DataTableActions<ICampaign> | undefined>(
    () =>
      canManage
        ? {
            extra: [
              { label: "Cancel campaign", icon: Ban, destructive: true, onClick: (row) => openDialog("cancel", row), hidden: (row) => !isOpen(row) },
            ],
          }
        : undefined,
    [canManage, openDialog],
  );

  return (
    <>
      <DataTable
        data={data?.data}
        columns={columns}
        getRowId={(row) => row.id}
        tableId="campaigns"
        isLoading={isLoading}
        isFetching={isFetching}
        search={{ placeholder: "Search campaigns..." }}
        filters={{ configs: CAMPAIGN_FILTERS }}
        exportFileName="campaigns"
        actions={actions}
        toolbarAction={
          <Button size="sm" className="h-8" onClick={() => setIsCreateOpen(true)}>
            <Plus aria-hidden="true" /> New campaign
          </Button>
        }
        emptyMessage="No campaigns yet."
      />
      <FormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} title="New campaign" description="One template, sent to a slice of users.">
        <CampaignForm onDone={() => setIsCreateOpen(false)} />
      </FormDialog>
      <ConfirmDialog
        {...getDialogProps("cancel")}
        title="Cancel campaign"
        description={`"${campaign?.title}" won't be sent. This can't be undone.`}
        variant="destructive"
        confirmLabel="Cancel campaign"
        pendingLabel="Cancelling..."
        isPending={cancel.isPending}
        onConfirm={async () => {
          if (campaign && (await cancel.run(campaign.id))) closeDialog();
        }}
      />
    </>
  );
};

export default CampaignsTable;
