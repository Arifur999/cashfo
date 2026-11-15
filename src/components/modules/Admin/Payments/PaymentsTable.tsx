"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type { DataTableActions, DataTableSimplePager } from "@/components/shared/table/dataTable.types";
import ShowingRange from "@/components/shared/table/ShowingRange";
import DataTable from "@/components/shared/table/DataTable";
import { useRowDialogs } from "@/hooks/useRowDialogs";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useServerDataTable } from "@/hooks/useServerDataTable";
import { buildTableQueryString } from "@/lib/queryString";
import { shortPaymentId } from "@/lib/payments";
import { toTableQueryProps } from "@/lib/table/queryProps";
import { paymentsListQuery } from "@/queries/payment.queries";
import { plansQuery } from "@/queries/plan.queries";
import type { IPayment } from "@/types/payment.types";
import { paymentsColumns } from "./paymentsColumns";
import { hasAnyParam, listStatusCounts, PAYMENT_NARROWING_KEYS, paymentHref } from "./paymentsDisplay";
import { buildPaymentsTableConfig, PAYMENTS_TABLE_BASE_CONFIG } from "./paymentsTable.config";
import { MarkPaymentPaidDialog } from "./MarkPaymentDialogs";
import RetryPaymentDialog from "./RetryPaymentDialog";

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

// Each column keeps its px, and Person gives way down to 150px before the
// table scrolls sideways (1,056px in all, inside the list card on a 1366
// laptop), so a phone never cuts an id or a plan to "PAY-2…". The actions
// column is the board's 70px for "Retry", and 104px for "আবার চেষ্টা".
const LAYOUT = { rowHeight: 54, actionsWidth: 70, flexMinWidth: 150 } as const;
const LAYOUT_BN = { ...LAYOUT, actionsWidth: 104 } as const;

// Retry is for finance roles; a failed payment goes back to Pending so it
// can be collected again (no gateway is charged from here).
const PaymentsTable = ({ canRetry }: { canRetry: boolean }) => {
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const plans = useQuery(plansQuery()).data?.data;
  const filtered = hasAnyParam(searchParams, PAYMENT_NARROWING_KEYS) || Boolean(searchParams.get("status"));

  // The same query string the page prefetched with; the table's own config
  // waits for the plans, and its tabs' counts come with the rows.
  const queryString = buildTableQueryString(searchParams, PAYMENTS_TABLE_BASE_CONFIG);
  const query = useQuery({ ...paymentsListQuery(queryString), placeholderData: keepPreviousData });
  const statusCounts = listStatusCounts(query.data?.meta);
  const config = useMemo(() => buildPaymentsTableConfig(plans ?? [], statusCounts), [plans, statusCounts]);
  // The page header's Export downloads the API's spreadsheet of these rows.
  const { dataTableProps } = useServerDataTable<IPayment>(config);

  // Retry asks first, as on the payment's page. The row is kept while the
  // dialog closes, so its title doesn't empty out while it animates away.
  const { activeRow, openDialog, getDialogProps } = useRowDialogs<IPayment, "retry" | "paid">();

  const actions = useMemo<DataTableActions<IPayment>>(
    () => ({
      display: "inline",
      heading: false,
      // "Retry for PAY-2E7904A3", to a screen reader.
      rowLabel: (row) => shortPaymentId(row.id),
      extra: [
        {
          label: "Retry",
          onClick: (row) => openDialog("retry", row),
          hidden: (row) => !canRetry || row.status !== "FAILED",
        },
        // A waiting checkout is confirmed by hand once the money is in.
        {
          label: "Mark paid",
          onClick: (row) => openDialog("paid", row),
          hidden: (row) => !canRetry || row.status !== "PENDING",
        },
      ],
    }),
    [canRetry, openDialog],
  );

  return (
    <>
      <DataTable
        {...dataTableProps}
        // An outage is never "No payments": the rows' place says the list
        // couldn't load, under a toolbar whose Reset clears a filter the
        // server refuses.
        {...toTableQueryProps(query)}
        errorTitle="Couldn't load payments"
        errorDescription="The server didn't answer. Nothing was changed."
        data={query.data?.data}
        columns={paymentsColumns}
        layout={locale === "bn" ? LAYOUT_BN : LAYOUT}
        getRowId={(row) => row.id}
        actions={actions}
        pager={PAGER}
        // Each row is a link to its payment's page, which leads back to this
        // tab, these filters and this page.
        rowHref={(row) => paymentHref(row.id, searchParams.toString())}
        // A payment that looks like a double charge gets the amber wash.
        rowClassName={(row) => (row.duplicateOfId ? "bg-warning-soft hover:bg-warning-soft" : undefined)}
        emptyMessage={filtered ? "No payments match these filters." : "No payments yet."}
      />
      <RetryPaymentDialog payment={activeRow} {...getDialogProps("retry")} />
      <MarkPaymentPaidDialog payment={activeRow} {...getDialogProps("paid")} />
    </>
  );
};

export default PaymentsTable;
