import type { PaginationMeta } from "@/types/api.types";

interface ListQueryState {
  data?: { meta?: PaginationMeta };
  isLoading: boolean;
  isFetching: boolean;
  // A useQuery result has both; a hand-made state may leave them out.
  isError?: boolean;
  refetch?: () => unknown;
}

// Maps a list useQuery result onto DataTable's meta, loading and error props:
// <DataTable {...dataTableProps} {...toTableQueryProps(query)} />. A read that
// failed with nothing to show draws the table's error and Try again (which
// reads again) under its toolbar; a refetch that failed keeps the rows.
export const toTableQueryProps = (query: ListQueryState) => {
  const { refetch } = query;
  return {
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: Boolean(query.isError) && !query.data,
    onRetry: refetch ? () => void refetch() : undefined,
  };
};
