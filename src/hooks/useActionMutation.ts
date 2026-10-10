"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ApiResult } from "@/types/api.types";

interface UseActionMutationOptions<TVariables, TData> {
  action: (variables: TVariables) => Promise<ApiResult<TData>>;
  successMessage: string | ((data: TData) => string);
  errorMessage?: string;
  // Query keys whose cached data this mutation makes stale.
  invalidateKeys?: QueryKey[];
  onSuccess?: (data: TData) => void;
  // Re-render the Server Component half of the page (summary cards, ...).
  refreshRoute?: boolean;
}

// The post-mutation sequence every create/edit/delete dialog needs, in one
// place: toast, invalidate the affected queries (which refetches the ones on
// screen), and router.refresh(). `run` resolves to true on success so the
// caller can close its dialog and reset its form.
export function useActionMutation<TVariables, TData = unknown>({
  action,
  successMessage,
  errorMessage = "Something went wrong",
  invalidateKeys = [],
  onSuccess,
  refreshRoute = true,
}: UseActionMutationOptions<TVariables, TData>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({ mutationFn: action });

  const run = async (variables: TVariables): Promise<boolean> => {
    let result: ApiResult<TData>;
    try {
      result = await mutation.mutateAsync(variables);
    } catch {
      // Actions never throw by design; this is the Next.js server itself
      // being unreachable.
      toast.error("Unable to reach the server. Please try again.");
      return false;
    }

    if (!result.success) {
      toast.error(result.message || errorMessage);
      return false;
    }

    toast.success(result.message || (typeof successMessage === "function" ? successMessage(result.data) : successMessage));
    onSuccess?.(result.data);
    await Promise.all(invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    if (refreshRoute) {
      router.refresh();
    }
    return true;
  };

  return { run, isPending: mutation.isPending };
}
