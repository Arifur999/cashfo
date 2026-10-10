"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { paymentsListQuery } from "@/queries/payment.queries";
import type { IPayment } from "@/types/payment.types";
import { paymentsColumns } from "./paymentsColumns";
import { getPaymentsView, PAYMENTS_TABLE_CONFIG } from "./paymentsTable.config";

const detailHref = (row: IPayment) => `/admin/payments/${row.id}`;

const PaymentsTable = () => {
  const router = useRouter();
  const view = getPaymentsView(useSearchParams().get("view"));
  const { queryString, dataTableProps } = useServerDataTable<IPayment>(PAYMENTS_TABLE_CONFIG[view]);
  const query = useQuery({ ...paymentsListQuery(queryString, view), placeholderData: keepPreviousData });

  const actions = useMemo<DataTableActions<IPayment>>(() => ({ onView: (row) => router.push(detailHref(row)) }), [router]);

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      // Each view keeps its own column choices.
      key={view}
      data={query.data?.data}
      columns={paymentsColumns[view]}
      getRowId={(row) => row.id}
      tableId={`payments-${view}`}
      exportFileName={view === "failed" ? "failed-payments" : "payments"}
      enableRowSelection
      actions={actions}
      onRowClick={(row) => router.push(detailHref(row))}
      emptyMessage="No payments match these filters."
    />
  );
};

export default PaymentsTable;
