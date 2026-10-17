// The errors page loads one page of the API's largest size and groups it.
// (A plain module, so the Server Component page can build the same query
// string the client board uses.)
export const ERRORS_LOADED = 100;

export type ErrorStatus = "open" | "fixed" | "all";

const RESOLVED_PARAM: Record<ErrorStatus, string> = { open: "&resolved=false", fixed: "&resolved=true", all: "" };

export const errorsQueryString = (status: ErrorStatus = "open") => `page=1&limit=${ERRORS_LOADED}${RESOLVED_PARAM[status]}`;
