import { isAxiosError } from "axios";

// What an API failure may carry once it leaves the HTTP client: the status,
// the API's own answer and the method and path. Never the request config,
// whose headers hold the Bearer token -- an AxiosError that reaches a Server
// Component render or a Server Action is printed whole by Next into the
// server logs. isAxiosError stays true, so the code that reads a failure
// (getActionErrorMessage, fetchOrNotFound, the customer readers) is unchanged.
export const toSafeApiError = (error: unknown): unknown => {
  if (!isAxiosError(error)) return error;
  const method = error.config?.method?.toUpperCase() ?? "";
  // The path only: no host, and no query string (search terms, filters).
  const path = (error.config?.url ?? "").replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  const outcome = error.response?.status ?? error.code ?? "NO_RESPONSE";
  return Object.assign(new Error(`API request failed: ${method} ${path} -> ${outcome}`), {
    name: "ApiRequestError",
    isAxiosError: true,
    code: error.code,
    config: { method: error.config?.method, url: path },
    response: error.response ? { status: error.response.status, data: error.response.data } : undefined,
  });
};
