"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { retryPaymentAction } from "@/app/(dashboardLayout)/admin/payments/_action";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useActionMutation } from "@/hooks/useActionMutation";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { queryKeys } from "@/lib/queryKeys";
import { buildTableQueryString } from "@/lib/queryString";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { paymentsListQuery, paymentStatsQuery } from "@/queries/payment.queries";
import { plansQuery } from "@/queries/plan.queries";
import type { IPayment } from "@/types/payment.types";
import { paymentsColumns } from "./paymentsColumns";
import { buildPaymentsTableConfig, PAYMENTS_TABLE_BASE_CONFIG } from "./paymentsTable.config";

const detailHref = (row: IPayment) => `/admin/payments/${row.id}`;

// Retry is for finance roles; a failed payment goes back to Pending so it
// can be collected again (no gateway is charged from here).
const PaymentsTable = ({ canRetry }: { canRetry: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plans = useQuery(plansQuery()).data?.data;
  const statusCounts = useQuery(paymentStatsQuery()).data?.data.statusCounts;

  // The same query string the page prefetched with; the table's own config
  // waits for the plans and the status counts its tabs show.
  const queryString = buildTableQueryString(searchParams, PAYMENTS_TABLE_BASE_CONFIG);
  const query = useQuery({ ...paymentsListQuery(queryString), placeholderData: keepPreviousData });
  const config = useMemo(() => buildPaymentsTableConfig(plans ?? [], statusCounts), [plans, statusCounts]);
  const { dataTableProps } = useServerDataTable<IPayment>(config);

  const retry = useActionMutation({
    action: retryPaymentAction,
    successMessage: "Payment set back to Waiting",
    invalidateKeys: [queryKeys.payments.all],
  });

  const actions = useMemo<DataTableActions<IPayment>>(
    () => ({
      display: "inline",
      extra: [{ label: "Retry", onClick: (row) => void retry.run(row.id), hidden: (row) => !canRetry || row.status !== "FAILED" }],
    }),
    [canRetry, retry],
  );

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={query.data?.data}
      columns={paymentsColumns}
      getRowId={(row) => row.id}
      tableId="payments"
      exportFileName="payments"
      enableRowSelection
      actions={actions}
      onRowClick={(row) => router.push(detailHref(row))}
      // A payment that looks like a double charge gets the amber wash.
      rowClassName={(row) => (row.duplicateOfId ? "bg-warning-soft/60 hover:bg-warning-soft" : undefined)}
      emptyMessage="No payments match these filters."
    />
  );
};

export default PaymentsTable;
