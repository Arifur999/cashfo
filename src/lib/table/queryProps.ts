import type { PaginationMeta } from "@/types/api.types";

interface ListQueryState {
  data?: { meta?: PaginationMeta };
  isLoading: boolean;
  isFetching: boolean;
}

// Maps a list useQuery result onto DataTable's meta/loading props:
// <DataTable {...dataTableProps} {...toTableQueryProps(query)} />
export const toTableQueryProps = (query: ListQueryState) => ({
  meta: query.data?.meta,
  isLoading: query.isLoading,
  isFetching: query.isFetching,
});
