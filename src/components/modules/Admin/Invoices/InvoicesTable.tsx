"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import LoadError from "@/components/modules/Admin/Payments/LoadError";
import { hasAnyParam } from "@/components/modules/Admin/Payments/paymentsDisplay";
import DataTable from "@/components/shared/table/DataTable";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { invoicesListQuery } from "@/queries/invoice.queries";
import { getInvoices } from "@/services/invoice.services";
import type { IInvoiceListItem } from "@/types/invoice.types";
import { INVOICES_LIST_HREF, invoiceHref } from "./invoiceDisplay";
import { invoicesColumns } from "./invoicesColumns";
import { INVOICES_TABLE_CONFIG } from "./invoicesTable.config";

const DATE_KEYS = ["dateFrom", "dateTo"] as const;

// Export reads every invoice in the date range, a page at a time, with the
// list's own fetch.
const fetchInvoicesPage = async (queryString: string) => {
  const { data, meta } = await getInvoices(queryString);
  return { rows: data, meta };
};

// A row opens its invoice (its number is the link to it), so it needs no
// menu of its own.
const InvoicesTable = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { queryString, dataTableProps } = useServerDataTable<IInvoiceListItem>(INVOICES_TABLE_CONFIG, { fetchPage: fetchInvoicesPage });
  const query = useQuery({ ...invoicesListQuery(queryString), placeholderData: keepPreviousData });
  const dated = hasAnyParam(searchParams, DATE_KEYS);

  // An outage is never "No invoices yet": the list says it couldn't load.
  if (query.isError && !query.data) {
    return <LoadError title="Couldn't load invoices" onRetry={() => void query.refetch()} clearHref={dated ? INVOICES_LIST_HREF : undefined} />;
  }

  return (
    <DataTable
      {...dataTableProps}
      {...toTableQueryProps(query)}
      data={query.data?.data}
      columns={invoicesColumns}
      getRowId={(row) => row.id}
      exportFileName="invoices"
      // The invoice's page leads back to these dates and this page.
      onRowClick={(row) => router.push(invoiceHref(row.id, searchParams.toString()))}
      emptyMessage={dated ? "No invoices in these dates." : "No invoices yet."}
    />
  );
};

export default InvoicesTable;
