"use client";

import { useQuery } from "@tanstack/react-query";
import { Ban, CopyPlus, Send, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { cancelCampaignAction, deleteCampaignAction, sendCampaignAction } from "@/app/(dashboardLayout)/admin/notifications/campaigns/_action";
import ConfirmDialog from "@/components/shared/dialog/ConfirmDialog";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
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
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { plural } from "@/lib/i18n/message";
import { humanizeEnum } from "@/lib/statusBadge";
import { CHANNEL_META } from "../notificationOptions";

const isOpen = (campaign: ICampaign) => campaign.status === "DRAFT" || campaign.status === "SCHEDULED";

// The campaigns, with the last day of sending beside them. Any admin can
// draft a campaign, and start a new one from a draft (a draft can't be
// edited yet); sending one now and cancelling are for the roles that may
// send. The board draws no actions column; they sit in each row's menu.
const CampaignsTable = ({ canManage }: { canManage: boolean }) => {
  const { locale, translate } = useLocale();
  const query = useQuery(campaignsQuery());
  const { data, isLoading, isFetching } = query;
  const { data: plansResponse } = useQuery(plansQuery());
  const { data: templatesResponse } = useQuery(notificationTemplatesQuery());
  const columns = useMemo(() => buildCampaignsColumns(new Map((plansResponse?.data ?? []).map((plan) => [plan.id, plan.name]))), [plansResponse]);
  const { activeRow: campaign, openDialog, closeDialog, getDialogProps } = useRowDialogs<ICampaign, "cancel" | "delete" | "reuse" | "send">();
  const dropped = campaign ? droppedUserStatus(campaign) : null;

  const cancel = useActionMutation({
    action: cancelCampaignAction,
    successMessage: (cancelled) => translate("{title} cancelled", { title: cancelled.title }),
    invalidateKeys: [queryKeys.campaigns.all],
    refreshRoute: false,
  });

  // One that never went out; a sent one stays as the record.
  const remove = useActionMutation({
    action: deleteCampaignAction,
    successMessage: translate("Campaign deleted"),
    invalidateKeys: [queryKeys.campaigns.all],
    refreshRoute: false,
  });

  const send = useActionMutation({
    action: sendCampaignAction,
    successMessage: (sent) =>
      sent.status === "SENT"
        ? plural(translate, sent.sentCount, "{title} sent to {count} person", "{title} sent to {count} people", { title: sent.title, count: formatCount(sent.sentCount, locale) })
        : translate("{title} is sending", { title: sent.title }),
    invalidateKeys: [queryKeys.campaigns.all, queryKeys.notificationLogs.all],
    refreshRoute: false,
  });

  const actions = useMemo<DataTableActions<ICampaign>>(
    () => ({
      rowLabel: (row) => row.title,
      extra: [
        ...(canManage ? [{ label: "Send now", icon: Send, onClick: (row: ICampaign) => openDialog("send", row), hidden: (row: ICampaign) => !isOpen(row) }] : []),
        { label: "Use as new campaign", icon: CopyPlus, onClick: (row) => openDialog("reuse", row), hidden: (row) => row.status !== "DRAFT" },
        ...(canManage ? [{ label: "Cancel campaign", icon: Ban, destructive: true, onClick: (row: ICampaign) => openDialog("cancel", row), hidden: (row: ICampaign) => !isOpen(row) }] : []),
        ...(canManage
          ? [{ label: "Delete", icon: Trash2, destructive: true, onClick: (row: ICampaign) => openDialog("delete", row), hidden: (row: ICampaign) => row.status === "SENT" || row.status === "SENDING" }]
          : []),
      ],
    }),
    [canManage, openDialog],
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <DataTable
        data={data?.data}
        columns={columns}
        layout={{ rowHeight: 62, headPadding: 12, designWidth: 820 }}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        // An outage isn't "no campaigns yet": the table says they didn't
        // load, with Try again, in the rows' place.
        isError={query.isError}
        onRetry={() => void query.refetch()}
        errorTitle="Couldn't load campaigns"
        errorDescription="Try again in a moment."
        // A short list: the board draws it without search or filters.
        hideToolbar
        actions={actions}
        emptyMessage="No campaigns yet."
      />
      <SendSummaryCard />
      <ConfirmDialog
        {...getDialogProps("delete")}
        title={translate("Delete {title}?", { title: campaign?.title ?? "" })}
        description="It was never sent, so nobody heard from it. It goes from the list for good."
        variant="destructive"
        confirmLabel="Delete campaign"
        pendingLabel="Deleting..."
        isPending={remove.isPending}
        onConfirm={async () => {
          if (campaign && (await remove.run(campaign.id))) closeDialog();
        }}
      />
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
      <ConfirmDialog
        {...getDialogProps("send")}
        icon={Send}
        title={translate("Send {title} now?", { title: campaign?.title ?? "" })}
        description={
          campaign ? (
            <>
              {plural(translate, campaign.reachableCount ?? campaign.audienceCount, "It goes to {count} person by {channel}. Sent messages can't be taken back.", "It goes to {count} people by {channel}. Sent messages can't be taken back.", {
                count: formatCount(campaign.reachableCount ?? campaign.audienceCount, locale),
                channel: translate(CHANNEL_META[campaign.channel].label).toLowerCase(),
              })}
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Send now"
        pendingLabel="Sending..."
        isPending={send.isPending}
        onConfirm={async () => {
          if (campaign && (await send.run(campaign.id))) closeDialog();
        }}
      />
      <FormDrawer title="New campaign" description={campaign ? translate("Starting from the draft {title}", { title: campaign.title }) : undefined} width="lg" centered {...getDialogProps("reuse")}>
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
