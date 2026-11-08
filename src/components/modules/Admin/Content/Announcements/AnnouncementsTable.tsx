"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { announcementsQuery } from "@/queries/announcement.queries";
import { plansQuery } from "@/queries/plan.queries";
import type { IAnnouncement } from "@/types/announcement.types";
import { toAnnouncementFormValues } from "./announcementForm.defaults";
import AnnouncementForm from "./AnnouncementForm";
import { buildAnnouncementsColumns } from "./announcementsColumns";
import LiveAnnouncementsCard from "./LiveAnnouncementsCard";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// What is live now, then every announcement, each with its Edit as the
// board draws it. Turning one off (or back on) is in its drawer's foot.
const AnnouncementsTable = ({ canManage }: { canManage: boolean }) => {
  const { translate } = useLocale();
  const query = useQuery(announcementsQuery());
  const { data, isLoading, isFetching } = query;
  const { data: plansResponse } = useQuery(plansQuery());
  const planNames = useMemo(() => new Map((plansResponse?.data ?? []).map((plan) => [plan.id, plan.name])), [plansResponse]);
  const columns = useMemo(() => buildAnnouncementsColumns(planNames), [planNames]);
  const { activeRow: announcement, openDialog, closeDialog, getDialogProps } = useRowDialogs<IAnnouncement, "edit">();

  const actions = useMemo<DataTableActions<IAnnouncement> | undefined>(
    () => (canManage ? { display: "inline", rowLabel: (row) => row.title, onEdit: (row) => openDialog("edit", row) } : undefined),
    [canManage, openDialog],
  );

  return (
    <>
      {data && <LiveAnnouncementsCard announcements={data.data} planNames={planNames} />}
      <DataTable
        data={data?.data}
        columns={columns}
        // The board's grid: 130 / title / 150 / 190 / 100 / 90.
        layout={{ gap: 16, rowHeight: 62, headPadding: 12, actionsWidth: 90 }}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        isFetching={isFetching}
        // An outage isn't "no announcements": the table says they didn't
        // load, with Try again, in the rows' place.
        isError={query.isError}
        onRetry={() => void query.refetch()}
        errorTitle="Couldn't load announcements"
        errorDescription="Try again in a moment."
        // A short list: the board draws it without search or filters.
        hideToolbar
        actions={actions}
        emptyMessage="No announcements yet."
      />
      <FormDrawer title={announcement ? translate("Edit: {title}", { title: announcement.title }) : "Edit announcement"} width="lg" centered {...getDialogProps("edit")}>
        {announcement && <AnnouncementForm announcement={announcement} defaultValues={toAnnouncementFormValues(announcement)} onDone={closeDialog} />}
      </FormDrawer>
    </>
  );
};

export default AnnouncementsTable;
