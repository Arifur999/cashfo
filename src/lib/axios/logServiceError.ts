import { isAxiosError } from "axios";

// Services log, then rethrow (the _action.ts layer turns the throw into a
// value). Never log the axios error object itself: its `config` carries the
// request headers, Authorization Bearer token and forwarded cookies included,
// which would leak credentials into the server logs.
//
// 4xx answers (validation, not found, conflict) are expected outcomes the UI
// already handles, so they're warnings; only 5xx and "no response" are errors.
export const logServiceError = (context: string, error: unknown) => {
  if (isAxiosError(error)) {
    const method = error.config?.method?.toUpperCase() ?? "";
    const url = error.config?.url ?? "";
    const status = error.response?.status;
    const message = `${context}: ${method} ${url} -> ${status ?? error.code ?? "NO_RESPONSE"}`;
    if (status !== undefined && status < 500) {
      console.warn(message);
    } else {
      console.error(message);
    }
    return;
  }

  console.error(`${context}:`, error instanceof Error ? error.message : error);
};
