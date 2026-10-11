"use client";

import { useQuery } from "@tanstack/react-query";
import DataTable from "@/components/shared/table/DataTable";
import { securityFlagsQuery } from "@/queries/security.queries";
import { FLAG_FILTERS } from "./flagOptions";
import { FLAGS_HIDDEN_COLUMNS, flagsColumns } from "./flagsColumns";
import RunDetectionButton from "./RunDetectionButton";

// Unpaginated from the API (open flags first), so filtered in memory.
const FlagsTable = () => {
  const { data, isLoading, isFetching } = useQuery(securityFlagsQuery());

  return (
    <DataTable
      data={data?.data}
      columns={flagsColumns}
      getRowId={(row) => row.id}
      tableId="security-flags"
      defaultHiddenColumns={FLAGS_HIDDEN_COLUMNS}
      isLoading={isLoading}
      isFetching={isFetching}
      search={{ placeholder: "Search activity, admin or IP..." }}
      filters={{ configs: FLAG_FILTERS }}
      exportFileName="suspicious-activity"
      toolbarAction={<RunDetectionButton />}
      emptyMessage="No suspicious activity flagged."
    />
  );
};

export default FlagsTable;
