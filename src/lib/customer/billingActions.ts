"use server";

import axios from "axios";
import { TOO_MANY_ATTEMPTS_MESSAGE } from "@/lib/actionError";
import { getClientHeaders } from "@/lib/axios/clientHeaders";
import { getAccessToken } from "@/lib/tokenUtils";
import { API_BASE_URL, getApiErrorMessage } from "./api";
import { customerApi } from "./apiClient";
import type { BillingOverview, BillingPayments, BillingPlans, CheckoutResult, CouponPreview, CustomerPayment, Gateway, ManualWallet } from "./billingDisplay";
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

// One of the customer's own payments (Checkout's "being checked" and "all
// set" views).
export async function getBillingPaymentAction(paymentId: string): Promise<SecurityResult<CustomerPayment>> {
  return callApi(async () => (await customerApi.get<CustomerPayment>(`${API_BASE_URL}/api/billing/payments/${encodeURIComponent(paymentId)}`)).data, "Couldn't load this payment");
}

// A checkout. With the details of the money sent (the number it came from
// and the TrxID) it goes straight to checking.
export async function checkoutAction(input: {
  planId: string;
  gateway: Gateway;
  couponCode?: string;
  payerAccount?: string;
  reference?: string;
}): Promise<SecurityResult<CheckoutResult>> {
  const body = {
    planId: input.planId,
    gateway: input.gateway,
    ...(input.couponCode?.trim() && { couponCode: input.couponCode.trim() }),
    ...(input.payerAccount !== undefined && { payerAccount: input.payerAccount }),
    ...(input.reference !== undefined && { reference: input.reference }),
  };
  return callApi(async () => (await customerApi.post<CheckoutResult>(`${API_BASE_URL}/api/billing/checkout`, body)).data, "Couldn't start the payment");
}

// "Fix the details" of a payment being checked.
export async function submitPaymentDetailsAction(paymentId: string, input: { gateway: ManualWallet; payerAccount: string; reference: string }): Promise<SecurityResult<CustomerPayment>> {
  return callApi(
    async () => (await customerApi.patch<CustomerPayment>(`${API_BASE_URL}/api/billing/checkout/${encodeURIComponent(paymentId)}`, input)).data,
    "Couldn't save the details",
  );
}

// The screenshot of the money sent: `screenshot` in a multipart body,
// built client-side. fetch(), not axios, for the multipart body (see
// uploadContactPhotoAction), with the visitor's headers by hand.
export async function uploadPaymentProofAction(paymentId: string, formData: FormData): Promise<SecurityResult> {
  const fallback = "Couldn't add the screenshot";
  try {
    const token = await getAccessToken();
    if (!token) return { success: false, message: fallback, status: 401 };
    const response = await fetch(`${API_BASE_URL}/api/billing/checkout/${encodeURIComponent(paymentId)}/proof`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, ...(await getClientHeaders()) },
      body: formData,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (response.status === 413) return { success: false, message: "The screenshot is bigger than 5 MB", status: 413 };
      return { success: false, message: getApiErrorMessage(body, fallback), status: response.status };
    }
    return { success: true };
  } catch {
    return { success: false, message: fallback };
  }
}

export async function removePaymentProofAction(paymentId: string): Promise<SecurityResult> {
  return callApi(async () => {
    await customerApi.delete(`${API_BASE_URL}/api/billing/checkout/${encodeURIComponent(paymentId)}/proof`);
  }, "Couldn't remove the screenshot");
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
