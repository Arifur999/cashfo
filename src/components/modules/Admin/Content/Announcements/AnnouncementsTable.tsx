"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useMemo, useState } from "react";
import { deleteAnnouncementAction, restoreAnnouncementAction } from "@/app/(dashboardLayout)/admin/content/announcements/_action";
import FormDrawer from "@/components/shared/dialog/FormDrawer";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import Card from "@/components/smartly/Card";
import ConfirmDialog from "@/components/smartly/ConfirmDialog";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { formatCount } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { queryKeys } from "@/lib/queryKeys";
import { announcementsQuery } from "@/queries/announcement.queries";
import { planAnalyticsQuery, plansQuery } from "@/queries/plan.queries";
import type { IAnnouncement } from "@/types/announcement.types";
import { toAnnouncementFormValues } from "./announcementForm.defaults";
import AnnouncementForm from "./AnnouncementForm";
import { buildAnnouncementsColumns } from "./announcementsColumns";
import CreateAnnouncementButton from "./CreateAnnouncementButton";
import LiveAnnouncementsCard from "./LiveAnnouncementsCard";

// The v16 board's Announcements: how they reach users (with how many are in
// the apps now and how many wait), then every announcement with Edit and
// Delete for everyone -- a few seconds to undo a delete. The live banners
// the app also shows follow the list.
const AnnouncementsTable = ({ canManage }: { canManage: boolean }) => {
  const { translate, locale } = useLocale();
  const query = useQuery(announcementsQuery());
  const { data, isLoading, isFetching } = query;
  const { data: plansResponse } = useQuery(plansQuery());
  const analytics = useQuery(planAnalyticsQuery()).data?.data;
  const planNames = useMemo(() => new Map((plansResponse?.data ?? []).map((plan) => [plan.id, plan.name])), [plansResponse]);
  const columns = useMemo(() => buildAnnouncementsColumns(planNames), [planNames]);
  const { activeRow: announcement, openDialog, closeDialog, getDialogProps } = useRowDialogs<IAnnouncement, "edit">();
  const [deleting, setDeleting] = useState<IAnnouncement | null>(null);
  const all = data?.data ?? [];
  const sent = all.filter((row) => row.status === "ACTIVE").length;
  const waiting = all.filter((row) => row.status === "SCHEDULED").length;

  const restore = useActionMutation({
    action: (id: string) => restoreAnnouncementAction(id),
    successMessage: "Restored. It is back in every user's bell.",
    invalidateKeys: [queryKeys.announcements.all],
    refreshRoute: false,
  });
  const remove = useActionMutation({
    action: (row: IAnnouncement) => deleteAnnouncementAction(row.id),
    successMessage: () =>
      deleting?.status === "SCHEDULED" ? translate("“{title}” is cancelled. It will not be sent.", { title: deleting.title }) : translate("“{title}” is deleted. It is gone from every user's bell.", { title: deleting?.title ?? "" }),
    successAction: (gone) => ({ label: "Undo", onClick: () => void restore.run(gone.id) }),
    invalidateKeys: [queryKeys.announcements.all],
    refreshRoute: false,
    onSuccess: () => setDeleting(null),
  });

  // How many people it reached: everyone, or one plan's.
  const reach = (row: IAnnouncement) => {
    if (!analytics) return null;
    if (!row.targetPlan) return analytics.summary.totalUsers;
    return analytics.perPlan.find((entry) => entry.planId === row.targetPlan)?.totalUsers ?? null;
  };
  const deletingReach = deleting ? reach(deleting) : null;

  const actions = useMemo<DataTableActions<IAnnouncement> | undefined>(
    () => (canManage ? { display: "inline", rowLabel: (row) => row.title, onEdit: (row) => openDialog("edit", row), onDelete: (row) => setDeleting(row) } : undefined),
    [canManage, openDialog],
  );

  return (
    <>
      <Card asChild padding="none" className="flex flex-wrap items-center gap-3.5 px-4.5 py-3.5">
        <section aria-label={translate("How announcements reach users")}>
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint-50 text-emerald">
            <Bell className="size-4.5" />
          </span>
          <span className="flex min-w-0 flex-1 basis-80 flex-col gap-0.5">
            <span className="text-[14.5px] font-semibold text-ink">{translate("Everything you send lands in the bell in every user's app at once")}</span>
            <span className="text-[13px] text-ink-muted">{translate("Delete one here and it disappears from every app straight away. Users can also delete one from their own bell, which only hides it for them.")}</span>
          </span>
          {data && (
            <span className="flex shrink-0 gap-2">
              <span className="rounded-full bg-mint-50 px-3 py-1.5 text-[12.5px] font-semibold text-brand-ink">{translate("{count} in apps now", { count: formatCount(sent, locale) })}</span>
              <span className="rounded-full bg-info-soft px-3 py-1.5 text-[12.5px] font-semibold text-info">{translate("{count} scheduled", { count: formatCount(waiting, locale) })}</span>
            </span>
          )}
        </section>
      </Card>
      {data && all.length === 0 ? (
        <Card padding="none" className="flex flex-col items-center gap-2.5 px-4.5 py-10 text-center">
          <span className="text-[15px] font-semibold text-ink">{translate("No announcements")}</span>
          <span className="text-[13.5px] text-ink-muted">{translate("Users' bells are empty. Send one when you have news for everyone.")}</span>
          {canManage && <CreateAnnouncementButton />}
        </Card>
      ) : (
        <DataTable
          data={data?.data}
          columns={columns}
          // The board's grid: 130 / title / 120 / 170 / 110 / 150.
          layout={{ gap: 16, rowHeight: 62, headPadding: 12, actionsWidth: 150 }}
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
          emptyMessage="No announcements"
        />
      )}
      {data && all.some((row) => row.status === "ACTIVE") && <LiveAnnouncementsCard announcements={all} planNames={planNames} />}
      <FormDrawer
        title="Edit announcement"
        description={announcement?.status === "SCHEDULED" ? "Not sent yet. Change anything before it goes out." : "Changes show up in every user's bell straight away."}
        width="3xl"
        centered
        {...getDialogProps("edit")}
      >
        {announcement && <AnnouncementForm announcement={announcement} defaultValues={toAnnouncementFormValues(announcement)} onDone={closeDialog} />}
      </FormDrawer>
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && void remove.run(deleting)}
        isPending={remove.isPending}
        title={translate("Delete “{title}” for everyone?", { title: deleting?.title ?? "" })}
        description={
          deleting?.status === "SCHEDULED"
            ? translate("It has not been sent yet, so no one will get it.")
            : deletingReach !== null
              ? translate("It disappears from the bell in all {count} users' apps right away, read or not. You can undo for a few seconds.", { count: formatCount(deletingReach, locale) })
              : translate("It disappears from every user's bell right away, read or not. You can undo for a few seconds.")
        }
        confirmLabel={translate(deleting?.status === "SCHEDULED" ? "Cancel and delete" : "Delete for everyone")}
      />
    </>
  );
};

export default AnnouncementsTable;
