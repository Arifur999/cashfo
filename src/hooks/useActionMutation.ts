"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useRef } from "react";
import { toast } from "sonner";
import type { ApiResult } from "@/types/api.types";
import { useLocale } from "@/lib/i18n/LocaleProvider";

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
//
// `run` keeps one identity for the component's lifetime while always using
// the latest options: it ends up in memoized table columns and row actions,
// and TanStack renders a column's `cell` function as a component type -- a
// new function per render would remount every cell (closing open menus,
// dropping in-place edits).
export function useActionMutation<TVariables, TData = unknown>(options: UseActionMutationOptions<TVariables, TData>) {
  const queryClient = useQueryClient();
  const router = useRouter();
  // Messages are English keys; whatever has Bangla is shown in it.
  const { translate } = useLocale();
  const translateRef = useRef(translate);
  useLayoutEffect(() => {
    translateRef.current = translate;
  });
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (variables: TVariables) => optionsRef.current.action(variables),
  });

  const run = useCallback(
    async (variables: TVariables): Promise<boolean> => {
      const { successMessage, errorMessage = "Something went wrong", invalidateKeys = [], onSuccess, refreshRoute = true } = optionsRef.current;

      let result: ApiResult<TData>;
      try {
        result = await mutateAsync(variables);
      } catch {
        // Actions never throw by design; this is the Next.js server itself
        // being unreachable.
        toast.error(translateRef.current("Unable to reach the server. Please try again."));
        return false;
      }

      if (!result.success) {
        toast.error(translateRef.current(result.message || errorMessage));
        return false;
      }

      toast.success(translateRef.current(result.message || (typeof successMessage === "function" ? successMessage(result.data) : successMessage)));
      onSuccess?.(result.data);
      await Promise.all(invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      if (refreshRoute) {
        router.refresh();
      }
      return true;
    },
    [mutateAsync, queryClient, router],
  );

  return { run, isPending };
}
