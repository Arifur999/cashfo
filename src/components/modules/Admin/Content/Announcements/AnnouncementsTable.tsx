"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { setAnnouncementEnabledAction } from "@/app/(dashboardLayout)/admin/content/announcements/_action";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { queryKeys } from "@/lib/queryKeys";
import { announcementsQuery } from "@/queries/announcement.queries";
import { plansQuery } from "@/queries/plan.queries";
import type { IAnnouncement } from "@/types/announcement.types";
import { toAnnouncementFormValues } from "./announcementForm.defaults";
import AnnouncementForm from "./AnnouncementForm";
import { buildAnnouncementsColumns } from "./announcementsColumns";
import LiveAnnouncementsCard from "./LiveAnnouncementsCard";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// What is live now, then every announcement. Edit and turn off sit in the
// row as the design draws them.
const AnnouncementsTable = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const { data, isLoading, isFetching } = useQuery(announcementsQuery());
  const { data: plansResponse } = useQuery(plansQuery());
  const columns = useMemo(() => buildAnnouncementsColumns(new Map((plansResponse?.data ?? []).map((plan) => [plan.id, plan.name]))), [plansResponse]);
  const { activeRow: announcement, openDialog, closeDialog, getDialogProps } = useRowDialogs<IAnnouncement, "edit">();

  const { run: setEnabled } = useActionMutation({
    action: ({ id, isActive }: { id: string; isActive: boolean }) => setAnnouncementEnabledAction(id, isActive),
    successMessage: (updated) => (updated.isActive ? "Announcement turned on" : "Announcement turned off"),
    invalidateKeys: [queryKeys.announcements.all],
    refreshRoute: false,
  });

  const actions = useMemo<DataTableActions<IAnnouncement> | undefined>(
    () =>
      canManage
        ? {
            display: "inline",
            onEdit: (row) => openDialog("edit", row),
            extra: [
              { label: "Turn on", onClick: (row) => void setEnabled({ id: row.id, isActive: true }), hidden: (row) => row.isActive },
              { label: "Turn off", destructive: true, onClick: (row) => void setEnabled({ id: row.id, isActive: false }), hidden: (row) => !row.isActive },
            ],
          }
        : undefined,
    [canManage, openDialog, setEnabled],
  );

  return (
    <>
      {data && <LiveAnnouncementsCard announcements={data.data} />}
      <DataTable
        data={data?.data}
        columns={columns}
        layout={{ gap: 16, rowHeight: 62, headPadding: 12, actionsWidth: 90 }}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        // A short list: the board draws it without search or filters.
        hideToolbar
        actions={actions}
        emptyMessage="No announcements yet."
      />
      <FormDrawer title={announcement ? translate("Edit: {title}", { title: announcement.title }) : "Edit announcement"} width="lg" {...getDialogProps("edit")}>
        {announcement && <AnnouncementForm announcement={announcement} defaultValues={toAnnouncementFormValues(announcement)} onDone={closeDialog} />}
      </FormDrawer>
    </>
  );
};

export default AnnouncementsTable;
