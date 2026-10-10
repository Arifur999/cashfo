// The envelope every service returns and every _action.ts resolves to.
//
// The NestJS backend answers with raw bodies (no { success, message, data }
// wrapper), so httpClient builds this envelope around response.data. The rest
// of the app therefore always sees one shape: a caller narrows on `success`
// and never touches an axios error.
export interface ApiResponse<TData = unknown> {
  success: true;
  message: string;
  data: TData;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}

export type ApiResult<TData = unknown> = ApiResponse<TData> | ApiErrorResponse;

// Mirrors the backend's ListMeta -- note `totalPage`, singular.
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
}

// Raw body of every `{ data, meta }` list endpoint, before httpClient lifts
// `meta` up onto the envelope.
export interface IPaginatedBody<TItem> {
  data: TItem[];
  meta: PaginationMeta;
}

// Raw body of the overview endpoints that page with `{ items, totalCount }`
// instead (owners, workspaces). Services normalize it to PaginationMeta.
export interface IItemsPageBody<TItem> {
  items: TItem[];
  page: number;
  limit: number;
  totalCount: number;
}
