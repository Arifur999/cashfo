"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { hasAnyParam } from "@/components/modules/Admin/Payments/paymentsDisplay";
import type { DataTableSimplePager } from "@/components/shared/table/dataTable.types";
import DataTable from "@/components/shared/table/DataTable";
import ShowingRange from "@/components/shared/table/ShowingRange";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { invoicesListQuery } from "@/queries/invoice.queries";
import { getInvoices } from "@/services/invoice.services";
import type { IInvoiceListItem } from "@/types/invoice.types";
import { invoiceHref } from "./invoiceDisplay";
import { invoicesColumns } from "./invoicesColumns";
import { INVOICES_TABLE_CONFIG } from "./invoicesTable.config";

const DATE_KEYS = ["dateFrom", "dateTo"] as const;

// Export reads every invoice in the date range, a page at a time, with the
// list's own fetch.
const fetchInvoicesPage = async (queryString: string) => {
  const { data, meta } = await getInvoices(queryString);
  return { rows: data, meta };
};

// "Showing 1–10 of 54 invoices", then Previous and Next, as the Payments
// tab beside it.
const PAGER: DataTableSimplePager = {
  previous: "Previous",
  next: "Next",
  summary: (total, { first, last }) => (
    <ShowingRange first={first} last={last} total={total}>
      {"Showing {range} of {total} invoices"}
    </ShowingRange>
  ),
};

// Each column keeps its px and "Issued to" gives way down to 200px, so a
// phone scrolls sideways with the amount and the date still readable.
const LAYOUT = { flexMinWidth: 200 } as const;

// A row is a link to its invoice, so it needs no menu of its own.
const InvoicesTable = () => {
  const searchParams = useSearchParams();
  const { queryString, dataTableProps } = useServerDataTable<IInvoiceListItem>(INVOICES_TABLE_CONFIG, { fetchPage: fetchInvoicesPage });
  const query = useQuery({ ...invoicesListQuery(queryString), placeholderData: keepPreviousData });
  const dated = hasAnyParam(searchParams, DATE_KEYS);

  return (
    <DataTable
      {...dataTableProps}
      // An outage is never "No invoices yet": the rows' place says the list
      // couldn't load, under the toolbar whose Reset clears the dates.
      {...toTableQueryProps(query)}
      errorTitle="Couldn't load invoices"
      errorDescription="The server didn't answer. Nothing was changed."
      data={query.data?.data}
      columns={invoicesColumns}
      layout={LAYOUT}
      getRowId={(row) => row.id}
      exportFileName="invoices"
      pager={PAGER}
      // The invoice's page leads back to these dates and this page.
      rowHref={(row) => invoiceHref(row.id, searchParams.toString())}
      emptyMessage={dated ? "No invoices in these dates." : "No invoices yet."}
    />
  );
};

export default InvoicesTable;
