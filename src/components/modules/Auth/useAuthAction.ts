"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import type { FillValues } from "@/lib/i18n/fill";
import { type AuthFormError, describeThrownActionCall } from "./authFormError";

interface ActionAnswer {
  success: boolean;
  // A success may have nothing to say.
  message?: string;
  // The message's {placeholders}, for a refusal that carries a figure.
  values?: FillValues;
  // The API's reason, and tries left after a wrong code.
  reason?: string;
  attemptsLeft?: number;
}

// Runs a sign-in page's Server Action the same way on every form. The
// action's own refusal ("Invalid email or password") becomes `error`, and so
// does the call itself failing -- which otherwise left the button going back
// to "Sign in" with nothing said. A success that redirects keeps the button
// busy until the next page replaces this one.
export function useAuthAction<TVariables, TAnswer extends ActionAnswer>(action: (variables: TVariables) => Promise<TAnswer>) {
  const [error, setError] = useState<AuthFormError | null>(null);
  const [leaving, setLeaving] = useState(false);
  const { mutateAsync, isPending } = useMutation({ mutationFn: action });

  // The action's answer, or null when there is none to read: the call failed
  // (`error` says why), or it succeeded by redirecting.
  const run = async (variables: TVariables): Promise<TAnswer | null> => {
    setError(null);
    try {
      const answer = await mutateAsync(variables);
      if (!answer.success) {
        setError({ message: answer.message || "Something went wrong", values: answer.values, reason: answer.reason, attemptsLeft: answer.attemptsLeft });
      }
      return answer;
    } catch (thrown) {
      const outcome = describeThrownActionCall(thrown);
      if (outcome.kind === "navigating") {
        setLeaving(true);
      } else {
        setError(outcome.error);
      }
      return null;
    }
  };

  return { run, error, clearError: () => setError(null), isPending: isPending || leaving };
}
