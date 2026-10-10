import type { IItemsPageBody, PaginationMeta } from "@/types/api.types";

// The owners/workspaces overview endpoints page with { items, page, limit,
// totalCount } instead of { data, meta }; this maps them onto the same
// PaginationMeta every DataTable reads.
export const toPaginationMeta = ({ page, limit, totalCount }: IItemsPageBody<unknown>): PaginationMeta => ({
  page,
  limit,
  total: totalCount,
  totalPage: Math.max(Math.ceil(totalCount / Math.max(limit, 1)), 1),
});
