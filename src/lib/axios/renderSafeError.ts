import { isAxiosError } from "axios";

// An AxiosError carries its whole request -- config.headers and the raw
// request with them, the "Authorization: Bearer ..." access token included --
// and an error that escapes into a Server Component render is printed whole
// by Next's request-error logger, into the container logs. Wherever an API
// failure is rethrown into a render (a layout, a page, an error boundary's
// reach), throw this instead: it names what failed and nothing more.
export const toRenderSafeError = (error: unknown): Error => {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error : new Error(String(error));
  }
  const method = error.config?.method?.toUpperCase() ?? "";
  // The path only: no host, and no query string (search terms, filters).
  const path = (error.config?.url ?? "").replace(/^https?:\/\/[^/]+/, "").split("?")[0];
  const outcome = error.response?.status ?? error.code ?? "NO_RESPONSE";
  return new Error(`API request failed: ${method} ${path} -> ${outcome}`);
};
