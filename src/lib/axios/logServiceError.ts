import { isAxiosError } from "axios";

// Services log, then rethrow (the _action.ts layer turns the throw into a
// value). Never log the axios error object itself: its `config` carries the
// request headers, Authorization Bearer token and forwarded cookies included,
// which would leak credentials into the server logs.
export const logServiceError = (context: string, error: unknown) => {
  if (isAxiosError(error)) {
    const method = error.config?.method?.toUpperCase() ?? "";
    const url = error.config?.url ?? "";
    const status = error.response?.status ?? error.code ?? "NO_RESPONSE";
    console.error(`${context}: ${method} ${url} -> ${status}`);
    return;
  }

  console.error(`${context}:`, error instanceof Error ? error.message : error);
};
