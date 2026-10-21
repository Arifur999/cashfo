"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { DataTableActions } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { invoicesListQuery } from "@/queries/invoice.queries";
import { getInvoices } from "@/services/invoice.services";
import type { IInvoiceListItem } from "@/types/invoice.types";
import { invoicesColumns } from "./invoicesColumns";
import { INVOICES_TABLE_CONFIG } from "./invoicesTable.config";

const detailHref = (row: IInvoiceListItem) => `/admin/invoices/${row.id}`;

// Export reads every invoice in the date range, a page at a time, with the
// list's own fetch.
const fetchInvoicesPage = async (queryString: string) => {
  const { data, meta } = await getInvoices(queryString);
  return { rows: data, meta };
};

const InvoicesTable = () => {
  const router = useRouter();
  const { queryString, dataTableProps } = useServerDataTable<IInvoiceListItem>(INVOICES_TABLE_CONFIG, { fetchPage: fetchInvoicesPage });
  const query = useQuery({ ...invoicesListQuery(queryString), placeholderData: keepPreviousData });
  const actions = useMemo<DataTableActions<IInvoiceListItem>>(() => ({ onView: (row) => router.push(detailHref(row)) }), [router]);

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={query.data?.data}
      columns={invoicesColumns}
      getRowId={(row) => row.id}
      exportFileName="invoices"
      actions={actions}
      onRowClick={(row) => router.push(detailHref(row))}
      emptyMessage="No invoices yet."
    />
  );
};

export default InvoicesTable;
