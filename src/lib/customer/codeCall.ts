import "server-only";
import axios from "axios";
import { TOO_MANY_ATTEMPTS_MESSAGE } from "@/lib/actionError";
import { getApiErrorMessage } from "./api";
import type { ActionResult } from "./authActions";

// What a call behind a six-digit code answers: the shared result, plus the
// API's own reason for a refusal and the figures that go with it -- the
// smallest withdrawal, what is available, a code's tries left, the seconds
// before a code may be sent again -- so the page can say exactly what
// happened. Used by the referral withdrawal and the phone's code flows.
export interface CodeResult<T = void> extends ActionResult<T> {
  reason?: string;
  status?: number;
  attemptsLeft?: number;
  retryAfterSec?: number;
  minWithdrawal?: string;
  available?: string;
}

interface RefusalBody {
  reason?: unknown;
  attemptsLeft?: unknown;
  retryAfterSec?: unknown;
  minWithdrawal?: unknown;
  available?: unknown;
}

const numberOr = (value: unknown): number | undefined => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
const stringOr = (value: unknown): string | undefined => (typeof value === "string" ? value : typeof value === "number" ? String(value) : undefined);

export async function callCodeApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<CodeResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = (error.response?.data ?? {}) as RefusalBody;
      const status = error.response?.status;
      const attemptsLeft = numberOr(body.attemptsLeft);
      const retryAfterSec = numberOr(body.retryAfterSec);
      const minWithdrawal = stringOr(body.minWithdrawal);
      const available = stringOr(body.available);
      const extra = {
        ...(status !== undefined && { status }),
        ...(typeof body.reason === "string" && { reason: body.reason }),
        ...(attemptsLeft !== undefined && { attemptsLeft }),
        ...(retryAfterSec !== undefined && { retryAfterSec }),
        ...(minWithdrawal !== undefined && { minWithdrawal }),
        ...(available !== undefined && { available }),
      };
      // The throttle's own "ThrottlerException: Too Many Requests" reads as
      // a crash; a 429 with a reason of its own (a code asked again too
      // soon) keeps the API's words.
      if (status === 429 && !extra.reason) return { success: false, message: TOO_MANY_ATTEMPTS_MESSAGE, ...extra, reason: "THROTTLED" };
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage), ...extra };
    }
    return { success: false, message: fallbackMessage };
  }
}
