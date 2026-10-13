import "server-only";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";
import type { ApiResponse } from "@/types/api.types";
import { toRenderSafeError } from "./renderSafeError";

// For detail pages: an unknown (or malformed) id answers 404/400, which
// should render the segment's not-found.tsx -- not the error boundary.
// Anything else (5xx, network) still throws to the error boundary -- as a
// plain error, never the AxiosError and the token it carries.
export const fetchOrNotFound = async <TData>(request: Promise<ApiResponse<TData>>): Promise<TData> => {
  try {
    const { data } = await request;
    return data;
  } catch (error) {
    if (isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 400)) {
      notFound();
    }
    throw toRenderSafeError(error);
  }
};
