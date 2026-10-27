"use client";

import { useForm } from "@tanstack/react-form";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { cancelReferralAction } from "@/app/(dashboardLayout)/admin/referrals/_action";
import StatusBadgeCell from "@/components/shared/cell/StatusBadgeCell";
import FormDialog from "@/components/shared/dialog/FormDialog";
import FormDialogFooter from "@/components/shared/dialog/FormDialogFooter";
import AppForm from "@/components/shared/form/AppForm";
import AppTextareaField from "@/components/shared/form/AppTextareaField";
import DataTable from "@/components/shared/table/DataTable";
import type { DataTableSimplePager } from "@/components/shared/table/dataTable.types";
import ShowingRange from "@/components/shared/table/ShowingRange";
import Button from "@/components/smartly/Button";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { type ServerDataTableConfig, useServerDataTable } from "@/hooks/useServerDataTable";
import { formatCurrency } from "@/lib/currency";
import { formatDate } from "@/lib/date";
import { toLocaleDigits } from "@/lib/i18n/digits";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { buildTableQueryString } from "@/lib/queryString";
import { queryKeys } from "@/lib/queryKeys";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { referralsListQuery } from "@/queries/referral.queries";
import type { PaginationMeta } from "@/types/api.types";
import type { IAdminReferralRow, ReferralStatus, ReferralStatusCounts } from "@/types/referral.types";
import { referralReasonServerZodSchema } from "@/zod/referral.validation";
import { CANCEL_REASON_TEXT, canCancelReferral, REFERRAL_STATUS_CHIP } from "./payoutsDisplay";
import { REFERRALS_TABLE_BASE_CONFIG } from "./payoutsTable.config";


const STATUS_TABS: { value: ReferralStatus; label: string }[] = [
  { value: "JOINED", label: "Joined" },
  { value: "PENDING", label: "Pending" },
  { value: "AVAILABLE", label: "Available" },
  { value: "PAID_OUT", label: "Paid out" },
  { value: "CANCELLED", label: "Cancelled" },
];

const buildConfig = (counts: ReferralStatusCounts | undefined): ServerDataTableConfig => ({
  ...REFERRALS_TABLE_BASE_CONFIG,
  search: { placeholder: "Member or friend", width: "sm" },
  filters: [{ id: "status", type: "tabs", label: "Status", options: STATUS_TABS.map((tab) => ({ ...tab, count: counts?.[tab.value] })) }],
});

const PAGER: DataTableSimplePager = {
  previous: "Previous",
  next: "Next",
  summary: (total, { first, last }) => (
    <ShowingRange first={first} last={last} total={total}>
      {"Showing {range} of {total} referrals"}
    </ShowingRange>
  ),
};

const LAYOUT = { rowHeight: 62, flexMinWidth: 160 } as const;

const Money = ({ value }: { value: string | null }) => {
  const { locale } = useLocale();
  return value === null ? "—" : formatCurrency(value, undefined, Number(value) % 1 ? 2 : 0, locale);
};

const Bought = ({ row }: { row: IAdminReferralRow }) => {
  const { translate } = useLocale();
  if (row.kind === "SIGNUP_BONUS") return <span className="text-small text-ink-muted">{translate("Sign-up bonus")}</span>;
  if (!row.payment) return <span className="text-small text-ink-muted">{translate("Not yet")}</span>;
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-ink">{row.payment.planName}</span>
      <Link href={`/admin/payments/${row.payment.id}`} className="truncate font-mono text-caption font-semibold text-emerald hover:underline">
        {row.payment.displayId} · <Money value={row.paidAmount ?? row.payment.amount} />
      </Link>
    </span>
  );
};

const Commission = ({ row }: { row: IAdminReferralRow }) => {
  const { translate, locale } = useLocale();
  if (row.status === "JOINED") return <span className="text-ink-muted">—</span>;
  return (
    <span className="flex flex-col gap-0.5">
      <b className="font-semibold text-ink tabular-nums">
        <Money value={row.commissionAmount} />
      </b>
      {row.commissionRate !== null && <span className="text-caption text-ink-muted">{translate("{rate}% of the payment", { rate: toLocaleDigits(String(row.commissionRate), locale) })}</span>}
    </span>
  );
};

const Status = ({ row }: { row: IAdminReferralRow }) => {
  const { translate, locale } = useLocale();
  const chip = REFERRAL_STATUS_CHIP[row.status];
  const day = (value: string | null) => formatDate(value, "d MMM", "—", locale);
  const note =
    row.status === "PENDING" && row.availableAt
      ? translate("Ready on {day}", { day: day(row.availableAt) })
      : row.status === "PAID_OUT" && row.paidOutAt
        ? translate("On {day}", { day: day(row.paidOutAt) })
        : row.status === "CANCELLED"
          ? translate(CANCEL_REASON_TEXT[row.cancelReason ?? ""] ?? "Cancelled")
          : null;
  return (
    <span className="flex flex-col items-start gap-0.5">
      <StatusBadgeCell status={row.status} label={chip.label} tone={chip.tone} dot />
      {note && <span className="text-[11.5px] text-ink-muted">{note}</span>}
    </span>
  );
};

const buildColumns = (canManage: boolean, onCancel: (row: IAdminReferralRow) => void): ColumnDef<IAdminReferralRow>[] => [
  {
    id: "referrer",
    accessorFn: (row) => row.referrer.name,
    header: "Member",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <Link href={`/admin/users/${row.original.referrer.id}`} className="truncate font-semibold text-ink hover:underline">
          {row.original.referrer.name}
        </Link>
        <span className="truncate text-caption text-ink-muted">{row.original.referrer.email}</span>
      </span>
    ),
  },
  {
    id: "friend",
    accessorFn: (row) => row.friend.name,
    header: "Friend",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <Link href={`/admin/users/${row.original.friend.id}`} className="truncate font-semibold text-ink hover:underline">
          {row.original.friend.name}
        </Link>
        <span className="truncate text-caption text-ink-muted">
          <JoinedOn value={row.original.joinedAt} />
        </span>
      </span>
    ),
  },
  { id: "bought", header: "Bought", enableSorting: false, cell: ({ row }) => <Bought row={row.original} />, meta: { width: 190 } },
  { id: "commission", header: "Commission", enableSorting: false, cell: ({ row }) => <Commission row={row.original} />, meta: { width: 140 } },
  { id: "status", accessorKey: "status", header: "Status", enableSorting: false, cell: ({ row }) => <Status row={row.original} />, meta: { width: 150 } },
  {
    id: "action",
    header: "Action",
    enableSorting: false,
    cell: ({ row }) =>
      canManage && canCancelReferral(row.original) ? <CancelButton row={row.original} onCancel={onCancel} /> : null,
    meta: { width: 110, align: "right" },
  },
];

const JoinedOn = ({ value }: { value: string }) => {
  const { translate, locale } = useLocale();
  return translate("Joined {day}", { day: formatDate(value, "d MMM yyyy", "—", locale) });
};

const CancelButton = ({ row, onCancel }: { row: IAdminReferralRow; onCancel: (row: IAdminReferralRow) => void }) => {
  const { translate } = useLocale();
  return (
    <Button type="button" variant="secondary" size="xs" className="h-8 border-expense-line px-2.75 text-[12.5px] text-expense hover:bg-expense-soft" onClick={() => onCancel(row)} aria-label={`${translate("Cancel commission")} ${row.friend.name}`}>
      {translate("Cancel@@commission")}
    </Button>
  );
};

// Cancelling a commission: the audit log keeps the reason, and the member
// is told in the app.
const CancelForm = ({ row, onDone }: { row: IAdminReferralRow; onDone: () => void }) => {
  const { translate, locale } = useLocale();
  const { run, isPending } = useActionMutation({
    action: (values: { reason: string }) => cancelReferralAction(row.id, values),
    successMessage: "Commission cancelled",
    invalidateKeys: [queryKeys.referrals.all],
  });
  const form = useForm({
    defaultValues: { reason: "" },
    onSubmit: async ({ value }) => {
      if (await run({ reason: value.reason.trim() })) onDone();
    },
  });
  return (
    <AppForm onSubmit={form.handleSubmit}>
      <p className="text-body leading-relaxed text-ink-2">
        {translate("{name} loses the {amount} earned from {friend}, and is told in the app.", {
          name: row.referrer.name,
          amount: formatCurrency(row.commissionAmount, undefined, 0, locale),
          friend: row.friend.name,
        })}
      </p>
      <form.Field name="reason" validators={{ onChange: referralReasonServerZodSchema.shape.reason }}>
        {(field) => <AppTextareaField field={field} label="Reason" rows={3} placeholder="Explain why" description="It goes into the audit log, and only admins can see it." />}
      </form.Field>
      <FormDialogFooter isPending={isPending} submitLabel="Cancel commission" pendingLabel="Cancelling..." variant="destructive" />
    </AppForm>
  );
};

// Every friend who joined with a member's link: what they bought, the
// commission and where it stands. A waiting or ready commission can be
// cancelled by those who manage payouts.
const ReferralsTable = ({ canManage }: { canManage: boolean }) => {
  const searchParams = useSearchParams();
  const { translate } = useLocale();
  const queryString = buildTableQueryString(searchParams, REFERRALS_TABLE_BASE_CONFIG);
  const query = useQuery({ ...referralsListQuery(queryString), placeholderData: keepPreviousData });
  const counts = (query.data?.meta as (PaginationMeta & { statusCounts?: ReferralStatusCounts }) | undefined)?.statusCounts;
  const config = useMemo(() => buildConfig(counts), [counts]);
  const { dataTableProps } = useServerDataTable<IAdminReferralRow>(config);
  const { activeRow, openDialog, getDialogProps } = useRowDialogs<IAdminReferralRow, "cancel">();
  const columns = useMemo(() => buildColumns(canManage, (row) => openDialog("cancel", row)), [canManage, openDialog]);
  const dialog = getDialogProps("cancel");

  return (
    <>
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        errorTitle="Couldn't load referrals"
        errorDescription="The server didn't answer. Nothing was changed."
        data={query.data?.data}
        columns={columns}
        layout={LAYOUT}
        getRowId={(row) => row.id}
        pager={PAGER}
        emptyMessage={searchParams.get("status") || searchParams.get("search") ? "No referrals match these filters." : "No one has joined with a link yet."}
      />
      <FormDialog {...dialog} title={translate("Cancel the commission for {friend}", { friend: activeRow?.friend.name ?? "" })} size="sm">
        {activeRow && <CancelForm row={activeRow} onDone={() => dialog.onOpenChange(false)} />}
      </FormDialog>
    </>
  );
};

export default ReferralsTable;
