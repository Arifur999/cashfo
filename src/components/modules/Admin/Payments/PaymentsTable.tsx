"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { DataTableActions, DataTableSimplePager } from "@/components/shared/table/dataTable.types";
import ShowingRange from "@/components/shared/table/ShowingRange";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { buildTableQueryString } from "@/lib/queryString";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { paymentsListQuery, paymentStatsQuery } from "@/queries/payment.queries";
import { plansQuery } from "@/queries/plan.queries";
import { getPayments } from "@/services/payment.services";
import type { IPayment } from "@/types/payment.types";
import LoadError from "./LoadError";
import { paymentsColumns } from "./paymentsColumns";
import { hasAnyParam, PAYMENT_NARROWING_KEYS, PAYMENTS_LIST_HREF, paymentHref } from "./paymentsDisplay";
import { buildPaymentsTableConfig, PAYMENTS_TABLE_BASE_CONFIG } from "./paymentsTable.config";
import RetryPaymentDialog from "./RetryPaymentDialog";

// Export reads every payment that matches, a page at a time, with the
// list's own fetch.
const fetchPaymentsPage = async (queryString: string) => {
  const { data, meta } = await getPayments(queryString);
  return { rows: data, meta };
};

// "Showing 1–10 of 1,912 payments", then Previous and Next.
const PAGER: DataTableSimplePager = {
  previous: "Previous",
  next: "Next",
  summary: (total, { first, last }) => (
    <ShowingRange first={first} last={last} total={total}>
      {"Showing {range} of {total} payments"}
    </ShowingRange>
  ),
};

// Retry is for finance roles; a failed payment goes back to Pending so it
// can be collected again (no gateway is charged from here).
const PaymentsTable = ({ canRetry }: { canRetry: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plans = useQuery(plansQuery()).data?.data;
  const statusCounts = useQuery(paymentStatsQuery()).data?.data.statusCounts;
  // The tabs' counts are all-time totals per status: beside a gateway, a
  // plan, a search or dates they would contradict the rows, so they show
  // on the whole list only.
  const narrowed = hasAnyParam(searchParams, PAYMENT_NARROWING_KEYS);
  const filtered = narrowed || Boolean(searchParams.get("status"));

  // The same query string the page prefetched with; the table's own config
  // waits for the plans and the status counts its tabs show.
  const queryString = buildTableQueryString(searchParams, PAYMENTS_TABLE_BASE_CONFIG);
  const query = useQuery({ ...paymentsListQuery(queryString), placeholderData: keepPreviousData });
  const config = useMemo(() => buildPaymentsTableConfig(plans ?? [], narrowed ? undefined : statusCounts), [plans, statusCounts, narrowed]);
  const { dataTableProps } = useServerDataTable<IPayment>(config, { fetchPage: fetchPaymentsPage });

  // Retry asks first, as on the payment's page. The row is kept after the
  // dialog closes, so its title doesn't empty out while it animates away.
  const [retryRow, setRetryRow] = useState<IPayment | null>(null);
  const [retryOpen, setRetryOpen] = useState(false);

  const actions = useMemo<DataTableActions<IPayment>>(
    () => ({
      display: "inline",
      heading: false,
      extra: [
        {
          label: "Retry",
          onClick: (row) => {
            setRetryRow(row);
            setRetryOpen(true);
          },
          hidden: (row) => !canRetry || row.status !== "FAILED",
        },
      ],
    }),
    [canRetry],
  );

  // An outage is never "No payments": the list says it couldn't load.
  if (query.isError && !query.data) {
    return <LoadError title="Couldn't load payments" onRetry={() => void query.refetch()} clearHref={filtered ? PAYMENTS_LIST_HREF : undefined} />;
  }

  return (
    <>
      <DataTable
        {...dataTableProps}
        {...toTableQueryProps(query)}
        data={query.data?.data}
        columns={paymentsColumns}
        // Room for "আবার চেষ্টা" as well as "Retry".
        layout={{ rowHeight: 54, actionsWidth: 104 }}
        getRowId={(row) => row.id}
        exportFileName="payments"
        actions={actions}
        pager={PAGER}
        // The payment's page leads back to this tab, these filters and this page.
        onRowClick={(row) => router.push(paymentHref(row.id, searchParams.toString()))}
        // A payment that looks like a double charge gets the amber wash.
        rowClassName={(row) => (row.duplicateOfId ? "bg-warning-soft hover:bg-warning-soft" : undefined)}
        emptyMessage={filtered ? "No payments match these filters." : "No payments yet."}
      />
      <RetryPaymentDialog payment={retryRow} open={retryOpen} onOpenChange={setRetryOpen} />
    </>
  );
};

export default PaymentsTable;
