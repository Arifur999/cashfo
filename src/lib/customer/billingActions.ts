"use server";

import axios from "axios";
import { TOO_MANY_ATTEMPTS_MESSAGE } from "@/lib/actionError";
import { API_BASE_URL, getApiErrorMessage } from "./api";
import { customerApi } from "./apiClient";
import type { BillingOverview, BillingPayments, BillingPlans, CheckoutResult, CouponPreview, Gateway } from "./billingDisplay";
import type { SecurityResult } from "./securityActions";

// Settings › Plans: the plans, the customer's own subscription, a trial,
// a coupon, the manual checkout and the payments. No real gateway yet: a
// checkout opens a PENDING payment the team marks paid once the money
// arrives.
async function callApi<T>(fn: () => Promise<T>, fallbackMessage: string): Promise<SecurityResult<T>> {
  try {
    return { success: true, data: await fn() };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = (error.response?.data ?? {}) as { reason?: unknown };
      const status = error.response?.status;
      const reason = typeof body.reason === "string" ? body.reason : undefined;
      if (status === 429 && !reason) return { success: false, message: TOO_MANY_ATTEMPTS_MESSAGE, reason: "THROTTLED", status };
      return { success: false, message: getApiErrorMessage(error.response?.data, fallbackMessage), ...(reason && { reason }), ...(status && { status }) };
    }
    return { success: false, message: fallbackMessage };
  }
}

export async function getBillingPlansAction(): Promise<SecurityResult<BillingPlans>> {
  return callApi(async () => (await customerApi.get<BillingPlans>(`${API_BASE_URL}/api/billing/plans`)).data, "Couldn't load the plans");
}

export async function getBillingOverviewAction(): Promise<SecurityResult<BillingOverview>> {
  return callApi(async () => (await customerApi.get<BillingOverview>(`${API_BASE_URL}/api/billing`)).data, "Couldn't load your plan");
}

export async function getBillingPaymentsAction(page = 1, limit = 10): Promise<SecurityResult<BillingPayments>> {
  return callApi(async () => (await customerApi.get<BillingPayments>(`${API_BASE_URL}/api/billing/payments`, { params: { page, limit } })).data, "Couldn't load your payments");
}

export async function startTrialAction(planId: string): Promise<SecurityResult<BillingOverview>> {
  return callApi(async () => (await customerApi.post<BillingOverview>(`${API_BASE_URL}/api/billing/trial`, { planId })).data, "Couldn't start the free trial");
}

export async function previewCouponAction(planId: string, code: string): Promise<SecurityResult<CouponPreview>> {
  return callApi(async () => (await customerApi.post<CouponPreview>(`${API_BASE_URL}/api/billing/coupon-preview`, { planId, code })).data, "Couldn't check that coupon");
}

export async function checkoutAction(input: { planId: string; gateway: Gateway; couponCode?: string }): Promise<SecurityResult<CheckoutResult>> {
  const body = { planId: input.planId, gateway: input.gateway, ...(input.couponCode?.trim() && { couponCode: input.couponCode.trim() }) };
  return callApi(async () => (await customerApi.post<CheckoutResult>(`${API_BASE_URL}/api/billing/checkout`, body)).data, "Couldn't start the payment");
}

export async function cancelCheckoutAction(paymentId: string): Promise<SecurityResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/billing/checkout/${encodeURIComponent(paymentId)}`);
  }, "Couldn't cancel the payment");
}

// Stop the plan at the end of the period it is paid for, or undo that.
export async function setCancelAtPeriodEndAction(cancel: boolean): Promise<SecurityResult<BillingOverview>> {
  return callApi(async () => (await customerApi.post<BillingOverview>(`${API_BASE_URL}/api/billing/${cancel ? "cancel" : "resume"}`, {})).data, cancel ? "Couldn't cancel your plan" : "Couldn't keep your plan");
}
