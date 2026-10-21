"use client";

import { useQuery } from "@tanstack/react-query";
import { Ban, CopyPlus } from "lucide-react";
import { useMemo } from "react";
import { cancelCampaignAction } from "@/app/(dashboardLayout)/admin/notifications/campaigns/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import ErrorState from "@/components/smartly/ErrorState";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { queryKeys } from "@/lib/queryKeys";
import { campaignsQuery, notificationTemplatesQuery } from "@/queries/notification.queries";
import { plansQuery } from "@/queries/plan.queries";
import type { ICampaign } from "@/types/notification.types";
import CampaignForm from "./CampaignForm";
import { campaignToFormValues, droppedUserStatus } from "./campaignOptions";
import { buildCampaignsColumns } from "./campaignsColumns";
import SendSummaryCard from "./SendSummaryCard";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { humanizeEnum } from "@/lib/statusBadge";

const isOpen = (campaign: ICampaign) => campaign.status === "DRAFT" || campaign.status === "SCHEDULED";

// The campaigns, with the last day of sending beside them. Any admin can
// draft a campaign, and start a new one from a draft (a draft can't be
// edited yet); cancelling is for the roles that may send.
const CampaignsTable = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const query = useQuery(campaignsQuery());
  const { data, isLoading, isFetching } = query;
  const { data: plansResponse } = useQuery(plansQuery());
  const { data: templatesResponse } = useQuery(notificationTemplatesQuery());
  const columns = useMemo(() => buildCampaignsColumns(new Map((plansResponse?.data ?? []).map((plan) => [plan.id, plan.name]))), [plansResponse]);
  const { activeRow: campaign, openDialog, closeDialog, getDialogProps } = useRowDialogs<ICampaign, "cancel" | "reuse">();
  const dropped = campaign ? droppedUserStatus(campaign) : null;

  const cancel = useActionMutation({
    action: cancelCampaignAction,
    successMessage: (cancelled) => translate("{title} cancelled", { title: cancelled.title }),
    invalidateKeys: [queryKeys.campaigns.all],
    refreshRoute: false,
  });

  const actions = useMemo<DataTableActions<ICampaign>>(
    () => ({
      extra: [
        { label: "Use as new campaign", icon: CopyPlus, onClick: (row) => openDialog("reuse", row), hidden: (row) => row.status !== "DRAFT" },
        ...(canManage ? [{ label: "Cancel campaign", icon: Ban, destructive: true, onClick: (row: ICampaign) => openDialog("cancel", row), hidden: (row: ICampaign) => !isOpen(row) }] : []),
      ],
    }),
    [canManage, openDialog],
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      {query.isError && !data ? (
        // An outage isn't "no campaigns yet": say they didn't load.
        <ErrorState title={translate("Couldn't load campaigns")} description={translate("Try again in a moment.")} onRetry={() => void query.refetch()} />
      ) : (
        <DataTable
          data={data?.data}
          columns={columns}
          layout={{ rowHeight: 62, headPadding: 12, designWidth: 820 }}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          isFetching={isFetching}
          // A short list: the board draws it without search or filters.
          hideToolbar
          actions={actions}
          emptyMessage="No campaigns yet."
        />
      )}
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
      <FormDrawer title="New campaign" description={campaign ? translate("Starting from the draft {title}", { title: campaign.title }) : undefined} width="lg" {...getDialogProps("reuse")}>
        {campaign && (
          <CampaignForm
            defaultValues={campaignToFormValues(campaign, templatesResponse?.data ?? [])}
            audienceNote={dropped ? translate("This draft was for {status} accounts. Pick who gets it again.", { status: translate(humanizeEnum(dropped)).toLowerCase() }) : undefined}
            onDone={closeDialog}
          />
        )}
      </FormDrawer>
    </div>
  );
};

export default CampaignsTable;
