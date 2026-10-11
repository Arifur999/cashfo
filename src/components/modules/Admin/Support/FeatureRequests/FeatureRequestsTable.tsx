"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import DataTable from "@/components/shared/table/DataTable";
import { featureRequestsQuery } from "@/queries/featureRequest.queries";
import { FEATURE_REQUEST_FILTERS } from "./featureRequestOptions";
import { buildFeatureRequestsColumns, FEATURE_REQUESTS_HIDDEN_COLUMNS } from "./featureRequestsColumns";

// The API returns every request (most-voted first) unpaginated, so the
// table searches, filters, sorts and pages in memory.
const FeatureRequestsTable = ({ canManage }: { canManage: boolean }) => {
  const { data, isLoading, isFetching } = useQuery(featureRequestsQuery());
  const columns = useMemo(() => buildFeatureRequestsColumns(canManage), [canManage]);

  return (
    <DataTable
      data={data?.data}
      columns={columns}
      getRowId={(row) => row.id}
      tableId="feature-requests"
      defaultHiddenColumns={FEATURE_REQUESTS_HIDDEN_COLUMNS}
      isLoading={isLoading}
      isFetching={isFetching}
      search={{ placeholder: "Search requests..." }}
      filters={{ configs: FEATURE_REQUEST_FILTERS }}
      exportFileName="feature-requests"
      emptyMessage="No feature requests yet."
    />
  );
};

export default FeatureRequestsTable;
