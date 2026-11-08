"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import DataTable from "@/components/shared/table/DataTable";
import type { DataTableSimplePager } from "@/components/shared/table/dataTable.types";
import ShowingRange from "@/components/shared/table/ShowingRange";
import Button from "@/components/smartly/Button";
import { type ServerDataTableConfig, useServerDataTable } from "@/hooks/useServerDataTable";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { buildTableQueryString } from "@/lib/queryString";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { payoutsListQuery } from "@/queries/referral.queries";
import type { PaginationMeta } from "@/types/api.types";
import { PAYOUT_METHOD_TYPES, type IPayoutRow, type PayoutStatus, type PayoutStatusCounts } from "@/types/referral.types";
import PayoutDrawer from "./PayoutDrawer";
import { buildPayoutColumns } from "./payoutsColumns";
import { METHOD_BRANDS } from "@/lib/customer/referralDisplay";
import { PAYOUT_PARAM, REFERRALS_HREF } from "./payoutsDisplay";
import { PAYOUTS_TABLE_BASE_CONFIG } from "./payoutsTable.config";
import RejectPayoutDialog from "./RejectPayoutDialog";


// The board's tabs; Cancelled only once a member has cancelled one, so the
// All tab's sum always covers every row.
const STATUS_TABS: { value: PayoutStatus; label: string }[] = [
  { value: "REQUESTED", label: "Requested" },
  { value: "APPROVED", label: "Approved" },
  { value: "PAID", label: "Paid" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

const buildConfig = (counts: PayoutStatusCounts | undefined): ServerDataTableConfig => ({
  ...PAYOUTS_TABLE_BASE_CONFIG,
  search: { placeholder: "Search name or WD-", width: "sm" },
  filters: [
    {
      id: "status",
      type: "tabs",
      label: "Status",
      options: STATUS_TABS.filter((tab) => tab.value !== "CANCELLED" || (counts?.CANCELLED ?? 0) > 0).map((tab) => ({ ...tab, count: counts?.[tab.value] })),
    },
    {
      id: "method",
      type: "single-select",
      label: "Method",
      allLabel: "All methods",
      options: PAYOUT_METHOD_TYPES.map((type) => ({ value: type, label: METHOD_BRANDS[type].name, raw: true })),
      align: "end",
    },
  ],
});

const PAGER: DataTableSimplePager = {
  previous: "Previous",
  next: "Next",
  summary: (total, { first, last }) => (
    <ShowingRange first={first} last={last} total={total}>
      {"Showing {range} of {total} requests"}
    </ShowingRange>
  ),
};

const LAYOUT = { rowHeight: 66, flexMinWidth: 150 } as const;

// The board's Export: every request the tabs and the method pick, as the
// API's own spreadsheet (with the account details the rows shorten).
const ExportLink = () => {
  const { translate } = useLocale();
  const searchParams = useSearchParams();
  const query = new URLSearchParams();
  for (const key of PAYOUTS_TABLE_BASE_CONFIG.queryKeys) {
    const value = searchParams.get(key);
    if (value) query.set(key, value);
  }
  return (
    <Button asChild variant="secondary" size="sm" className="h-9 text-small font-medium">
      <a href={`${REFERRALS_HREF}/export${query.size ? `?${query}` : ""}`} download>
        <Download className="size-3.5 text-ink-muted" aria-hidden="true" />
        {translate("Export")}
      </a>
    </Button>
  );
};

// The board's note under the desk, with Review in bold.
const ReviewNote = () => {
  const { translate } = useLocale();
  return (
    <>
      {translate('Each request lists the exact friend payments it is made of. Open <b>Review</b> to match every payment ID with SSLCommerz, bKash or Nagad. Untick anything that did not reach us; it goes back to the user as "Under check" and is not paid.')
        .split(/<\/?b>/)
        .map((part, index) => (index === 1 ? <b key={index} className="font-semibold text-ink">{part}</b> : part))}
    </>
  );
};

interface PayoutsTableProps {
  canManage: boolean;
}

// The payout desk. Reject asks why; Review (approve line by line), Mark
// paid and View open the request's drawer (?payout=<id>, so the
// admin bell can link to one).
const PayoutsTable = ({ canManage }: PayoutsTableProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryString = buildTableQueryString(searchParams, PAYOUTS_TABLE_BASE_CONFIG);
  const query = useQuery({ ...payoutsListQuery(queryString), placeholderData: keepPreviousData });
  const counts = (query.data?.meta as (PaginationMeta & { statusCounts?: PayoutStatusCounts }) | undefined)?.statusCounts;
  const config = useMemo(() => buildConfig(counts), [counts]);
  const { dataTableProps } = useServerDataTable<IPayoutRow>(config);

  const openId = searchParams.get(PAYOUT_PARAM);
  const setOpen = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (id) next.set(PAYOUT_PARAM, id);
      else next.delete(PAYOUT_PARAM);
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const [rejecting, setRejecting] = useState<{ row: IPayoutRow; open: boolean } | null>(null);

  const columns = useMemo(
    () =>
      buildPayoutColumns({
        canManage,
        onReject: (row) => setRejecting({ row, open: true }),
        onOpen: (row) => setOpen(row.id),
      }),
    [canManage, setOpen],
  );

  return (
    <>
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        errorTitle="Couldn't load payout requests"
        errorDescription="The server didn't answer. Nothing was changed."
        data={query.data?.data}
        columns={columns}
        layout={LAYOUT}
        getRowId={(row) => row.id}
        pager={PAGER}
        toolbarAction={<ExportLink />}
        // A waiting request whose checks found something gets the amber wash.
        rowClassName={(row) => (row.status === "REQUESTED" && row.checks.some((check) => !check.ok) ? "bg-warning-50 hover:bg-warning-50" : undefined)}
        emptyMessage={searchParams.get("status") || searchParams.get("method") || searchParams.get("search") ? "No requests here." : "No payout requests yet."}
        footer={<ReviewNote />}
      />
      <PayoutDrawer payoutId={openId} onClose={() => setOpen(null)} canManage={canManage} />
      <RejectPayoutDialog payout={rejecting?.row ?? null} open={Boolean(rejecting?.open)} onOpenChange={(open) => !open && setRejecting((current) => current && { ...current, open: false })} />
    </>
  );
};

export default PayoutsTable;
