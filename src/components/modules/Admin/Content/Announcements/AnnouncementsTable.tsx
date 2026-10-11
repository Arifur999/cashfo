"use client";

import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useMemo } from "react";
import { setAnnouncementEnabledAction } from "@/app/(dashboardLayout)/admin/content/announcements/_action";
import FormDialog from "@/components/shared/dialog/FormDialog";
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
import { ANNOUNCEMENT_FILTERS } from "./announcementOptions";
import { buildAnnouncementsColumns } from "./announcementsColumns";
import CreateAnnouncementDialog from "./CreateAnnouncementDialog";

const AnnouncementsTable = ({ canManage }: { canManage: boolean }) => {
  const { data, isLoading, isFetching } = useQuery(announcementsQuery());
  const { data: plansResponse } = useQuery(plansQuery());
  const columns = useMemo(
    () => buildAnnouncementsColumns(new Map((plansResponse?.data ?? []).map((plan) => [plan.id, plan.name]))),
    [plansResponse],
  );
  const { activeRow: announcement, openDialog, closeDialog, getDialogProps } = useRowDialogs<IAnnouncement, "edit">();

  const { run: setEnabled } = useActionMutation({
    action: ({ id, isActive }: { id: string; isActive: boolean }) => setAnnouncementEnabledAction(id, isActive),
    successMessage: (updated) => (updated.isActive ? "Announcement enabled" : "Announcement disabled"),
    invalidateKeys: [queryKeys.announcements.all],
    refreshRoute: false,
  });

  const actions = useMemo<DataTableActions<IAnnouncement> | undefined>(
    () =>
      canManage
        ? {
            onEdit: (row) => openDialog("edit", row),
            extra: [
              { label: "Enable", icon: Eye, onClick: (row) => void setEnabled({ id: row.id, isActive: true }), hidden: (row) => row.isActive },
              {
                label: "Disable",
                icon: EyeOff,
                destructive: true,
                onClick: (row) => void setEnabled({ id: row.id, isActive: false }),
                hidden: (row) => !row.isActive,
              },
            ],
          }
        : undefined,
    [canManage, openDialog, setEnabled],
  );

  return (
    <>
      <DataTable
        data={data?.data}
        columns={columns}
        getRowId={(row) => row.id}
        tableId="announcements"
        isLoading={isLoading}
        isFetching={isFetching}
        search={{ placeholder: "Search announcements..." }}
        filters={{ configs: ANNOUNCEMENT_FILTERS }}
        exportFileName="announcements"
        actions={actions}
        toolbarAction={canManage ? <CreateAnnouncementDialog /> : undefined}
        emptyMessage="No announcements yet."
      />
      <FormDialog title="Edit announcement" description={announcement?.title} size="lg" {...getDialogProps("edit")}>
        {announcement && (
          <AnnouncementForm announcement={announcement} defaultValues={toAnnouncementFormValues(announcement)} onDone={closeDialog} />
        )}
      </FormDialog>
    </>
  );
};

export default AnnouncementsTable;
